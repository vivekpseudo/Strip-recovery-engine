import type Stripe from "stripe";
import type { PoolClient } from "pg";
import { stripe } from "./stripe.js";
import { classifyDecline } from "./decline-classifier.js";

export async function processStripeEvent(client:PoolClient,event:Stripe.Event):Promise<void>{
 const invoice=event.data.object as Stripe.Invoice;
 if(!event.type.startsWith("invoice.")||!invoice.customer)return;
 const customerId=typeof invoice.customer==="string"?invoice.customer:invoice.customer.id;
 const mapping=await client.query("SELECT tenant_id FROM customers WHERE stripe_customer_id=$1 LIMIT 1",[customerId]);
 if(!mapping.rowCount){await client.query("UPDATE stripe_events SET processing_error='customer_not_connected_to_tenant',attempts=attempts+1,next_attempt_at=now()+interval '15 minutes' WHERE id=$1",[event.id]);return;}
 const tenantId=mapping.rows[0].tenant_id as string;
 await client.query("UPDATE stripe_events SET tenant_id=$2 WHERE id=$1",[event.id,tenantId]);
 if(!["invoice.payment_failed","invoice.payment_succeeded","invoice.paid","invoice.voided","invoice.marked_uncollectible"].includes(event.type))return;
 let failureCode:string|null=null;let declineCategory:string|null=null;
 if(event.type==="invoice.payment_failed"){
  let pi:Stripe.PaymentIntent|null=null;
  const piRef=(invoice as any).payment_intent;
  const piId=typeof piRef==="string"?piRef:piRef?.id;
  if(piId){try{pi=await stripe.paymentIntents.retrieve(piId,{expand:["latest_charge"]});}catch(e){console.warn("payment_intent_lookup_failed",e instanceof Error?e.message:"unknown");}}
  const charge=pi?.latest_charge&&typeof pi.latest_charge!=="string"?pi.latest_charge as Stripe.Charge:null;
  const code=pi?.last_payment_error?.code??(invoice as any).last_finalization_error?.code??null;
  const decline=pi?.last_payment_error?.decline_code??charge?.failure_code??null;
  const classification=classifyDecline({code,declineCode:decline,outcomeType:charge?.outcome?.type});
  failureCode=classification.sourceCode;declineCategory=classification.category;
 }
 const status=event.type==="invoice.payment_failed"?"past_due":event.type==="invoice.voided"?"void":event.type==="invoice.marked_uncollectible"?"uncollectible":"paid";
 await client.query(`INSERT INTO invoices(tenant_id,stripe_invoice_id,stripe_customer_id,amount_due,amount_paid,currency,status,attempt_count,last_failure_code,decline_category,recovered_at,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
 ON CONFLICT(tenant_id,stripe_invoice_id) DO UPDATE SET amount_due=EXCLUDED.amount_due,amount_paid=GREATEST(invoices.amount_paid,EXCLUDED.amount_paid),currency=EXCLUDED.currency,status=EXCLUDED.status,attempt_count=GREATEST(invoices.attempt_count,EXCLUDED.attempt_count),last_failure_code=COALESCE(EXCLUDED.last_failure_code,invoices.last_failure_code),decline_category=COALESCE(EXCLUDED.decline_category,invoices.decline_category),recovered_at=CASE WHEN EXCLUDED.status='paid' THEN COALESCE(invoices.recovered_at,now()) ELSE invoices.recovered_at END,updated_at=now()`,
 [tenantId,invoice.id,customerId,invoice.amount_due,invoice.amount_paid,invoice.currency,status,invoice.attempt_count??0,failureCode,declineCategory,status==="paid"?new Date():null]);
 const local=await client.query("SELECT id FROM invoices WHERE tenant_id=$1 AND stripe_invoice_id=$2",[tenantId,invoice.id]);
 const localId=local.rows[0].id as string;
 if(event.type==="invoice.payment_failed"){
  const key="invoice:"+invoice.id+":"+event.id+":email";
  await client.query("INSERT INTO recovery_jobs(tenant_id,invoice_id,job_type,run_at,dedupe_key,payload) VALUES($1,$2,'dunning_email',now(),$3,$4::jsonb) ON CONFLICT(dedupe_key) DO NOTHING",[tenantId,localId,key,JSON.stringify({stripeEventId:event.id,declineCategory,failureCode})]);
  await client.query("INSERT INTO recovery_logs(tenant_id,invoice_id,event_type,details) VALUES($1,$2,'payment_failed',$3::jsonb)",[tenantId,localId,JSON.stringify({stripeEventId:event.id,attemptCount:invoice.attempt_count,declineCategory,failureCode})]);
 }else if(status==="paid"){
  await client.query("UPDATE recovery_jobs SET status='cancelled',locked_by=NULL,lease_until=NULL,updated_at=now() WHERE tenant_id=$1 AND invoice_id=$2 AND status IN('pending','processing')",[tenantId,localId]);
  await client.query("INSERT INTO recovery_logs(tenant_id,invoice_id,event_type,details) VALUES($1,$2,'payment_recovered',$3::jsonb)",[tenantId,localId,JSON.stringify({stripeEventId:event.id,amountPaid:invoice.amount_paid,currency:invoice.currency})]);
 }
}