import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import Stripe from "stripe";
import { config } from "./lib/config.js";
import { pool } from "./lib/db.js";
import { stripe } from "./lib/stripe.js";
import { processStripeEvent } from "./lib/stripe-events.js";
import { requireTenantAuth, requirePermission } from "./lib/tenant-auth.js";
import { withTenant } from "./lib/tenant-db.js";

const app=express(); app.disable("x-powered-by"); app.use(helmet()); app.use(cors({origin:false}));
app.get("/health",(_req,res)=>res.json({ok:true}));
app.post("/webhooks/stripe",express.raw({type:"application/json",limit:"1mb"}),async(req,res)=>{
 const signature=req.header("stripe-signature");
 if(!signature||!Buffer.isBuffer(req.body)){res.status(400).json({error:"missing_signature_or_body"});return;}
 let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(req.body,signature,config.STRIPE_WEBHOOK_SECRET);}
 catch{res.status(400).json({error:"invalid_webhook_signature"});return;}
 try{
  const inserted=await pool.query("INSERT INTO stripe_events(id,event_type,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id",[event.id,event.type,JSON.stringify(event)]);
  if(!inserted.rowCount){
   const old=await pool.query("SELECT processed_at,processing_error FROM stripe_events WHERE id=$1",[event.id]);
   if(old.rows[0]?.processed_at||!old.rows[0]?.processing_error){res.status(200).json({received:true,duplicate:true});return;}
  }
  const client=await pool.connect();
  try{await client.query("BEGIN");await processStripeEvent(client,event);await client.query("UPDATE stripe_events SET processed_at=now(),processing_error=NULL WHERE id=$1",[event.id]);await client.query("COMMIT");}
  catch(e){await client.query("ROLLBACK").catch(()=>undefined);await pool.query("UPDATE stripe_events SET processing_error=$2 WHERE id=$1",[event.id,e instanceof Error?e.message.slice(0,500):"processing_failed"]);res.status(500).json({error:"event_processing_failed"});return;}
  finally{client.release();}
  res.status(200).json({received:true});
 }catch(e){console.error("stripe_webhook_failed",e instanceof Error?e.message:"unknown");res.status(500).json({error:"event_persistence_failed"});}
});
app.use(express.json({limit:"256kb"}));
app.get("/api/dashboard/summary",requireTenantAuth,requirePermission("dashboard:read"),async(req,res)=>{
 const client=await pool.connect();
 try{
  const data=await withTenant(client,req.principal!,async()=>{
   const q=await client.query(`SELECT COUNT(*) FILTER(WHERE status IN('open','past_due'))::int AS invoices_at_risk,
    COUNT(*) FILTER(WHERE recovered_at IS NOT NULL)::int AS recovered_invoices,
    COALESCE(SUM(amount_paid) FILTER(WHERE recovered_at IS NOT NULL),0)::bigint AS recovered_amount,
    COALESCE(SUM(amount_due) FILTER(WHERE status IN('open','past_due')),0)::bigint AS amount_at_risk,
    COUNT(*) FILTER(WHERE recovered_at IS NOT NULL AND recovered_at-created_at<=interval '7 days')::int AS recovered_within_7d
    FROM invoices`);
   return q.rows[0];
  });
  res.json(data);
 }catch{res.status(500).json({error:"dashboard_query_failed"});}finally{client.release();}
});
app.post("/api/billing-portal",requireTenantAuth,requirePermission("customers:write"),async(req,res)=>{
 const customerId=typeof req.body?.stripeCustomerId==="string"?req.body.stripeCustomerId:"";
 if(!customerId.startsWith("cus_")){res.status(400).json({error:"valid_stripe_customer_id_required"});return;}
 const client=await pool.connect();
 try{
  const exists=await withTenant(client,req.principal!,async()=>client.query("SELECT stripe_customer_id FROM customers WHERE stripe_customer_id=$1",[customerId]));
  if(!exists.rowCount){res.status(404).json({error:"customer_not_found"});return;}
  const session=await stripe.billingPortal.sessions.create({customer:customerId,return_url:config.APP_BASE_URL});
  res.json({url:session.url});
 }catch{res.status(502).json({error:"billing_portal_unavailable"});}finally{client.release();}
});
const server=app.listen(config.PORT,()=>console.log(`API listening on :${config.PORT}`));
const shutdown=()=>server.close(()=>void pool.end().finally(()=>process.exit(0)));
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
