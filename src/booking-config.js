// Public Google appointment schedule, created for Desartly with the owner's approval.
const schedule='AcZssZ3C3auPFZoi3MITYdkB_KspkGrV0Kxn_Q1jCHL8P-7HmJ7hTzoZHVx_mTYYLf5xpkn-1xtw9BDK';
export const bookingUrl=`https://calendar.google.com/calendar/appointments/schedules/${schedule}`;
export const bookingManageUrl=`https://calendar.google.com/calendar/u/0/r/appointment/servicetoken/${schedule}`;
export function formatBrief(brief){return `Session: ${brief.meetingType==='mentorship'?'Mentorship':'Project briefing'} (30 minutes)\nName: ${brief.name}\nEmail: ${brief.email}\nCompany: ${brief.company}\nServices: ${brief.services.join(', ')}\nIndustry: ${brief.industry}\n\n${brief.message}`;}
