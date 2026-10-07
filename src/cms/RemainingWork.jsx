import React from 'react';
import {MarkdownContent} from '../StudioTools.jsx';
import report from '../../docs/REMAINING-WORK.fa.md?raw';
export function RemainingWork(){return <section className="cms-panel cms-form remaining-work" lang="fa" dir="rtl"><span className="cms-eyebrow">برنامهٔ توسعه / کارهای باقی‌مانده</span><h2>مسیر بعدی سایت</h2><p>وضعیت ثبت‌شدهٔ کارها؛ اجرای هر مورد با درخواست تو شروع می‌شود.</p><details><summary>نمایش گزارش کامل کارهای باقی‌مانده</summary><MarkdownContent source={report}/></details></section>;}
