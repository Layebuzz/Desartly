import {bookingEmailHtml} from './booking-email-template.js';
import {formatBrief} from '../src/booking-config.js';

export const bookingOwnerEmail='komeilipv@gmail.com';
export const emailConnectionKey='google-calendar:owner-email';
export const emailScopes=['https://www.googleapis.com/auth/gmail.send','openid','email'];
const base64=text=>Buffer.from(text,'utf8').toString('base64');

export function bookingEmail(row){
 const brief=JSON.parse(row.brief),confirmation=JSON.parse(row.confirmation||'{}');
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',dateStyle:'full',timeStyle:'short'}).format(new Date(row.start_at));
 const body=`A new appointment was booked on Desartly.\n\n${time} (Asia/Tehran)\nDuration: 30 minutes\nGoogle Meet: ${confirmation.meetingUrl||'Open the appointment in Google Calendar'}\n\n${formatBrief(brief)}\n\nManage: https://desartly.vercel.app/studio/calendar\nBooking ID: ${row.id}\n`;
 const boundary='desartly_'+crypto.randomUUID().replaceAll('-','');
 const encoded=text=>base64(text).match(/.{1,76}/g).join('\r\n');
 const mime=[`From: Desartly <${bookingOwnerEmail}>`,`To: ${bookingOwnerEmail}`,
  `Subject: =?UTF-8?B?${base64('Desartly — New booking')}?=`,
  `Message-ID: <booking-${row.id}@desartly.vercel.app>`,`Date: ${new Date().toUTCString()}`,
  'MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encoded(body),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',encoded(bookingEmailHtml(row)),`--${boundary}--` ].join('\r\n');
 return Buffer.from(mime,'utf8').toString('base64url');
}

// Mail acceptance and booking confirmation are independent. A mail failure must
// never make a successfully reserved appointment appear to have failed.
export async function flushBookingEmails(env,getToken){
 if(!env.DB)return;
 await env.DB.prepare("INSERT OR IGNORE INTO booking_owner_emails(booking_id,status) SELECT id,'pending' FROM calendar_bookings WHERE status='confirmed' AND signature NOT LIKE 'reschedule:%' AND end_at>?").bind(Date.now()).run();
 await env.DB.prepare("UPDATE booking_owner_emails SET status='uncertain' WHERE status='sending' AND updated_at<?").bind(Date.now()-120000).run();
 const rows=await env.DB.prepare("SELECT b.*,e.attempts FROM booking_owner_emails e JOIN calendar_bookings b ON b.id=e.booking_id WHERE e.status='pending' AND e.next_attempt<=? AND b.status='confirmed' AND b.end_at>? ORDER BY b.created_at LIMIT 10").bind(Date.now(),Date.now()).all();
 if(!rows.results.length)return;
 // Refresh before claiming a message: expired/revoked access cannot strand it.
 const accessToken=await getToken();
 for(const row of rows.results){
  const claimed=await env.DB.prepare("UPDATE booking_owner_emails SET status='sending',attempts=attempts+1,updated_at=? WHERE booking_id=? AND status='pending'").bind(Date.now(),row.id).run();
  if(!claimed.meta.changes)continue;
  try{
   const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({raw:bookingEmail(row)}),signal:AbortSignal.timeout(10000)});
   if(response.ok){
    const message=await response.json();if(!message.id)throw Error('Missing Gmail acceptance ID');
    await env.DB.prepare("UPDATE booking_owner_emails SET status='sent',message_id=?,updated_at=? WHERE booking_id=?").bind(message.id,Date.now(),row.id).run();
   }else if([401,403,429].includes(response.status)){
    const attempts=row.attempts+1;
    await env.DB.prepare('UPDATE booking_owner_emails SET status=?,next_attempt=?,updated_at=? WHERE booking_id=?').bind(attempts>=5?'failed':'pending',Date.now()+Math.min(3600000,60000*2**attempts),Date.now(),row.id).run();
   }else{
    await env.DB.prepare("UPDATE booking_owner_emails SET status=?,updated_at=? WHERE booking_id=?").bind(response.status>=500?'uncertain':'failed',Date.now(),row.id).run();
   }
  }catch{
   // Gmail has no idempotency key. Do not blindly resend a lost response.
   await env.DB.prepare("UPDATE booking_owner_emails SET status='uncertain',updated_at=? WHERE booking_id=? AND status='sending'").bind(Date.now(),row.id).run();
  }
 }
}
