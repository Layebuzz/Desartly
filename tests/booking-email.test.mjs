import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {bookingEmail,flushBookingEmails,bookingOwnerEmail} from '../server/booking-email.js';
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const file of ['0002_calendar.sql','0003_booking_email.sql'])db.exec(readFileSync(new URL('../server/migrations/'+file,import.meta.url),'utf8'));
 const row={id:'a'.repeat(32),brief:JSON.stringify({name:'علی\r\nBcc: evil@test.invalid',email:'guest@test.invalid',company:'Test',services:['Branding'],industry:'Design',message:'A design project.'}),confirmation:JSON.stringify({meetingUrl:'https://meet.google.com/test'}),start_at:Date.now()+86400000};
 db.prepare("INSERT INTO calendar_bookings VALUES(?,?,?,?, 'confirmed',0,'signature',?,?,?)").run(row.id,'primary',row.start_at,row.start_at+1800000,row.brief,row.confirmation,new Date().toISOString());
 const env={DB:{prepare(sql){return {bind(...v){return {async first(){return db.prepare(sql).get(...v)},async all(){return {results:db.prepare(sql).all(...v)}},async run(){return {meta:{changes:db.prepare(sql).run(...v).changes}}}}}}}}};
 return {env,db,row};
}
test('owner email has a fixed recipient and safely encodes Unicode and injected headers',()=>{
 const {row}=fixture();const mime=Buffer.from(bookingEmail(row),'base64url').toString('utf8');
 const headers=mime.split('\r\n\r\n')[0];const plain=mime.split('Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n')[1];const body=plain.split('\r\n--')[0];assert(headers.includes('To: '+bookingOwnerEmail));assert(!headers.includes('Bcc:'));assert(!headers.includes('guest@test.invalid'));
 const text=Buffer.from(body.replaceAll('\r\n',''),'base64').toString('utf8');assert(text.includes('علی'));assert(text.includes('https://meet.google.com/test'));assert(text.includes('Asia/Tehran'));assert(text.includes('guest@test.invalid'));assert(text.includes('https://studio.desartly.info/studio/calendar'));
});
test('cron mail is sent once across repeated and concurrent scans',async t=>{
 const {env,db}=fixture();let calls=0;t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert(String(url).includes('/messages/send'));assert(options.headers.Authorization==='Bearer fixture');return Response.json({id:'gmail-id'});});
 await Promise.all([flushBookingEmails(env,async()=>'fixture'),flushBookingEmails(env,async()=>'fixture')]);await flushBookingEmails(env,async()=>'fixture');assert.equal(calls,1);assert.equal(db.prepare('SELECT status FROM booking_owner_emails').get().status,'sent');
});
test('mail with a lost response stays uncertain and is not blindly resent',async t=>{
 const {env,db}=fixture();let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('response lost')});await flushBookingEmails(env,async()=>'fixture');await flushBookingEmails(env,async()=>'fixture');assert.equal(calls,1);assert.equal(db.prepare('SELECT status FROM booking_owner_emails').get().status,'uncertain');assert.equal(db.prepare('SELECT status FROM calendar_bookings').get().status,'confirmed');
});
test('rejected sends are delayed for retry; cancelled bookings send nothing',async t=>{
 const {env,db}=fixture();let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:429})});await flushBookingEmails(env,async()=>'fixture');await flushBookingEmails(env,async()=>'fixture');assert.equal(calls,1);assert.equal(db.prepare('SELECT status FROM booking_owner_emails').get().status,'pending');db.exec("UPDATE calendar_bookings SET status='cancelled'; UPDATE booking_owner_emails SET next_attempt=0;");await flushBookingEmails(env,async()=>'fixture');assert.equal(calls,1);
});
test('token refresh failure leaves mail pending without attempting delivery',async t=>{
 const {env,db}=fixture();let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++});await assert.rejects(flushBookingEmails(env,async()=>{throw Error('renew access')}));assert.equal(calls,0);assert.equal(db.prepare('SELECT status FROM booking_owner_emails').get().status,'pending');
});


test('branded HTML is multipart, escapes briefs and rejects unsafe meeting links',async()=>{
 const {bookingEmailHtml}=await import('../server/booking-email-template.js');const {row}=fixture();row.brief=JSON.stringify({...JSON.parse(row.brief),message:'<img src=x onerror=alert(1)> & hello',company:'</td><script>bad()</script>'});row.confirmation=JSON.stringify({meetingUrl:'javascript:alert(1)'});
 const html=bookingEmailHtml(row);assert(html.includes('Desartly'));assert(html.includes('#e8e1fa'));assert(html.includes('Manage appointment in Studio'));assert(html.includes('https://studio.desartly.info/studio/calendar'));assert(!html.includes('<script>'));assert(!html.includes('<img'));assert(!html.includes('javascript:'));assert(html.includes('&lt;img'));const mime=Buffer.from(bookingEmail(row),'base64url').toString();assert(mime.includes('multipart/alternative'));assert(mime.includes('Content-Type: text/html; charset=UTF-8'));
});

test('verified domain notifications use branded mail and appear in Studio Sent',async t=>{const {env,db,row}=fixture();db.exec(readFileSync(new URL('../server/migrations/0004_mailbox.sql',import.meta.url),'utf8'));env.RESEND_API_KEY='fixture';env.RESEND_DOMAIN_READY='true';let calls=0;t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');const mail=JSON.parse(options.body);assert.equal(mail.from,'Desartly <Komeili@desartly.info>');assert.deepEqual(mail.to,[bookingOwnerEmail]);assert(mail.html.includes('Desartly'));assert.equal(options.headers['Idempotency-Key'],'booking-'+row.id);return Response.json({id:'resend-fixture'});});await flushBookingEmails(env,async()=>{throw Error('Gmail should not be used');});await flushBookingEmails(env,async()=>{});assert.equal(calls,1);assert.equal(db.prepare('SELECT folder,status FROM mailbox_messages').get().folder,'sent');assert.equal(db.prepare('SELECT status FROM booking_owner_emails').get().status,'sent');});
