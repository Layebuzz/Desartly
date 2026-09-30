const coverImage = "/journal/aesthetic-usability-effect.svg";

const english = `## The interface worked. So why did the user struggle?

Imagine a usability session that seems to contradict itself. The participant misses a navigation label, hesitates before the primary action, and takes a longer route to finish the task. Then, in the interview, they say: “It felt easy.”

This is not necessarily bad research or an unreliable participant. It may be the **aesthetic–usability effect**: people tend to perceive attractive products as easier to use, even when measurable performance tells a more complicated story.

The important word is *perceive*. Visual quality can improve trust, motivation and tolerance. It can also soften the way people report friction. A polished interface does not automatically become usable; it can receive a more generous first verdict.

## Where the idea came from

In 1995, Masaaki Kurosu and Kaori Kashimura studied 26 variations of an ATM interface with 252 participants. Their short CHI paper separated **apparent usability**—how usable an interface seemed—from **inherent usability**—the functional qualities built into its layout. Ratings of apparent usability were more strongly associated with visual appeal than with inherent usability.

That early study did not prove that beauty always overrides function. It identified a gap between judgment and performance, under a specific experimental setup.

Noam Tractinsky, A. S. Katz and Dror Ikar revisited the relationship in 2000. Their experiment found that the system’s visual aesthetics affected post-use judgments of both beauty and usability, while the manipulated level of actual usability did not show the same effect on those judgments. The result strengthened the case that aesthetics and perceived usability are entangled.

A decade later, Andreas Sonderegger and Juergen Sauer examined aesthetics inside a usability test. Participants used functionally equivalent mobile phones with different visual treatments. The more attractive version produced better perceived-usability ratings and also affected measured performance in the experimental task. That distinction matters: aesthetics can bias a report, but emotion and motivation may also change how people act.

## What the evidence does—and does not—say

The slogan “beautiful things work better” is too blunt. The research supports a narrower and more useful conclusion:

- visual appeal can raise **perceived** usability;
- it can make people more patient with **minor** friction;
- under some conditions, it may affect performance through emotion, confidence or motivation;
- it does not rescue a system that repeatedly blocks important tasks.

The studies also have boundaries. They examine particular interfaces, tasks, samples and definitions of aesthetics. Culture, familiarity, accessibility needs, device context and the severity of a usability problem can all change the outcome. Aesthetic quality is not a universal number, and a positive rating is not a substitute for observing behaviour.

## The research trap: listening without watching

The effect becomes dangerous when a team collects only attitudes. Ask “Was this easy?” after showing a refined prototype and you may receive a generous answer. The participant may genuinely like the product, may want to be polite, or may translate visual coherence into a feeling of ease.

Meanwhile, the session recording can show a different reality: three attempts, a wrong turn and a recovery that depended on luck.

This is why a strong usability study separates at least three layers:

1. **Performance:** Did the person complete the task? How long did it take? Where did errors and recoveries happen?
2. **Perception:** How easy, trustworthy or satisfying did the experience feel?
3. **Explanation:** What does the participant believe helped or obstructed them?

None of these layers is “the truth” on its own. Together, they describe the experience more honestly.

## A practical protocol for design teams

### 1. Define success before the screen looks finished

Write the behavioural signal first: “A new customer can compare two plans and choose one without opening support.” This protects the study from becoming a beauty contest.

### 2. Record behaviour before asking for an opinion

Note completion, time, misclicks, hesitation, backtracking and requests for help. Ask for a rating afterwards. The order reduces the chance that a strong visual reaction becomes the only story in the room.

### 3. Compare like with like

If the question is visual style, keep information architecture and interaction constant. If the question is the flow, avoid comparing a sketch with a production-ready screen. Different levels of finish introduce an obvious confound.

### 4. Probe without leading

Instead of “Did the design make this easy?”, ask: “What made this step easy or difficult?” Return to a moment of hesitation and ask the participant to describe what they expected.

### 5. Report perception and performance separately

Do not compress them into one “UX score.” A useful finding can read: “Participants liked the calm visual system, but 5 of 8 overlooked the plan comparison control.” That sentence gives the team something to preserve and something to repair.

### 6. Retest after the first impression fades

For products used repeatedly, one-session preference is not enough. Track whether clarity, speed and error rate improve or deteriorate after familiarity grows.

## Beauty is part of usability—but not proof of it

The wrong response to this research is to make interfaces deliberately plain. Visual design creates hierarchy, communicates relationships and shapes emotional readiness. Those are functional contributions.

The better response is to demand two standards at once: the product should **feel coherent** and **behave clearly**. Aesthetics can earn attention and patience. Interaction design must repay that trust.

When a participant says, “It looks great,” treat it as real evidence—about aesthetic response. Then look back at the task. Did the interface help them understand, decide and recover? That is where perceived ease meets usable reality.

## Sources

1. Kurosu, M., & Kashimura, K. (1995). [Apparent Usability vs. Inherent Usability](https://doi.org/10.1145/223355.223680). *CHI ’95 Conference Companion*, 292–293.
2. Tractinsky, N., Katz, A. S., & Ikar, D. (2000). [What is beautiful is usable](https://doi.org/10.1016/S0953-5438(00)00031-X). *Interacting with Computers, 13*(2), 127–145.
3. Sonderegger, A., & Sauer, J. (2010). [The influence of design aesthetics in usability testing](https://pubmed.ncbi.nlm.nih.gov/19892317/). *Applied Ergonomics, 41*(3), 403–410.
4. Moran, K. (2024; reviewed 2026). [The Aesthetic–Usability Effect](https://www.nngroup.com/articles/aesthetic-usability-effect/). Nielsen Norman Group. Practical interpretation, not a primary study.

*Evidence note: the claims above are limited to what these studies measured. They should guide test design, not be treated as a universal law.*`;

const persian = `## رابط کار می‌کرد؛ پس چرا کاربر به زحمت افتاد؟

یک جلسهٔ آزمون کاربردپذیری را تصور کنید که انگار با خودش تناقض دارد. شرکت‌کننده برچسب مسیریابی را نمی‌بیند، پیش از اقدام اصلی مکث می‌کند و برای پایان کار مسیر طولانی‌تری می‌رود. بااین‌حال، در گفت‌وگوی پایانی می‌گوید: «کار کردن با آن راحت بود.»

این تناقض لزوماً نشانهٔ پژوهش ضعیف یا شرکت‌کنندهٔ غیرقابل‌اعتماد نیست. ممکن است با **اثر زیبایی–کاربردپذیری** روبه‌رو باشیم: گرایش ما به اینکه محصول جذاب‌تر را آسان‌تر و کاربردپذیرتر بدانیم، حتی وقتی عملکرد واقعی داستان پیچیده‌تری دارد.

واژهٔ کلیدی «برداشت» است. کیفیت بصری می‌تواند اعتماد، انگیزه و تحمل کاربر را افزایش دهد؛ اما در عین حال، ممکن است اصطکاک را در گزارش کلامی او کم‌رنگ کند. رابط صیقلی خودبه‌خود کاربردپذیر نمی‌شود؛ فقط احتمال دارد در نگاه اول داوری سخاوتمندانه‌تری بگیرد.

## این ایده از کجا آمد؟

در سال ۱۹۹۵، ماساآکی کوروسو و کائوری کاشیمورا ۲۶ نسخه از رابط یک دستگاه خودپرداز را با ۲۵۲ شرکت‌کننده بررسی کردند. مقالهٔ کوتاه آن‌ها در CHI میان **کاربردپذیری ظاهری**—اینکه رابط چقدر کاربردپذیر به نظر می‌رسد—و **کاربردپذیری ذاتی**—ویژگی‌های عملکردی نهفته در چیدمان—تفکیک قائل شد. ارزیابی کاربردپذیری ظاهری، با جذابیت بصری همبستگی بیشتری داشت تا با کاربردپذیری ذاتی.

این مطالعه ثابت نکرد که زیبایی همیشه بر عملکرد غلبه می‌کند. یافتهٔ دقیق‌تر این بود که در یک موقعیت آزمایشی مشخص، میان قضاوت کاربر و کیفیت عملکردی فاصله وجود دارد.

نوام تراکتینسکی، ای. اس. کتز و درور ایکار در سال ۲۰۰۰ این رابطه را دوباره آزمودند. در آزمایش آن‌ها، زیبایی بصری سیستم بر ارزیابی پس از استفاده از زیبایی و کاربردپذیری اثر گذاشت؛ اما دست‌کاری سطح کاربردپذیری واقعی همان اثر را بر این قضاوت‌ها نشان نداد. این نتیجه پیوند میان زیبایی و کاربردپذیری ادراک‌شده را جدی‌تر کرد.

یک دهه بعد، آندریاس زوندرگر و یورگن زاور نقش زیبایی را درون آزمون کاربردپذیری سنجیدند. شرکت‌کنندگان با تلفن‌های همراهی کار کردند که از نظر عملکرد معادل، اما از نظر ظاهر متفاوت بودند. نسخهٔ جذاب‌تر هم امتیاز کاربردپذیری ادراک‌شدهٔ بهتری گرفت و هم بر عملکرد اندازه‌گیری‌شده در تکلیف آزمایشی اثر گذاشت. این تمایز مهم است: زیبایی می‌تواند گزارش کاربر را سوگیر کند، اما احساس و انگیزه نیز ممکن است رفتار او را تغییر دهند.

## شواهد چه می‌گویند و چه نمی‌گویند؟

جملهٔ «چیزهای زیبا بهتر کار می‌کنند» بیش از حد کلی است. شواهد، نتیجه‌ای محدودتر و مفیدتر را پشتیبانی می‌کنند:

- جذابیت بصری می‌تواند **کاربردپذیری ادراک‌شده** را افزایش دهد؛
- ممکن است تحمل کاربر را در برابر اصطکاک‌های **جزئی** بیشتر کند؛
- در بعضی شرایط، از مسیر احساس، اعتمادبه‌نفس یا انگیزه بر عملکرد اثر بگذارد؛
- اما سیستمی را که بارها مانع انجام کار اصلی می‌شود نجات نمی‌دهد.

این پژوهش‌ها مرزهایی هم دارند. هر مطالعه رابط‌ها، تکلیف‌ها، نمونه‌ها و تعریف مشخصی از زیبایی را بررسی کرده است. فرهنگ، آشنایی قبلی، نیازهای دسترس‌پذیری، نوع دستگاه و شدت مسئله می‌توانند نتیجه را تغییر دهند. کیفیت زیبایی‌شناختی یک عدد جهان‌شمول نیست و امتیاز مثبت جای مشاهدهٔ رفتار را نمی‌گیرد.

## دام پژوهش: شنیدن بدون دیدن

خطر از جایی آغاز می‌شود که تیم فقط نگرش‌ها را جمع‌آوری کند. اگر بعد از نمایش یک نمونهٔ صیقلی بپرسیم «کار کردن با آن آسان بود؟»، ممکن است پاسخ سخاوتمندانه‌ای بگیریم. شاید شرکت‌کننده واقعاً محصول را دوست داشته باشد؛ شاید بخواهد مؤدب باشد؛ یا شاید انسجام بصری را به حس آسانی ترجمه کند.

در همان حال، ویدئوی جلسه می‌تواند واقعیت دیگری نشان دهد: سه تلاش، یک مسیر اشتباه و بازیابی‌ای که بیشتر حاصل شانس بوده است.

به همین دلیل، آزمون قوی کاربردپذیری دست‌کم سه لایه را از هم جدا می‌کند:

۱. **عملکرد:** آیا فرد کار را تمام کرد؟ چقدر زمان برد؟ خطا و بازیابی کجا رخ داد؟

۲. **ادراک:** تجربه چقدر آسان، قابل‌اعتماد یا رضایت‌بخش احساس شد؟

۳. **توضیح:** خود شرکت‌کننده چه چیزی را عامل کمک یا مانع می‌داند؟

هیچ‌کدام به‌تنهایی «حقیقت کامل» نیستند. کنار هم، تجربه را صادقانه‌تر توصیف می‌کنند.

## پروتکلی عملی برای تیم‌های طراحی

### ۱. پیش از صیقلی شدن صفحه، موفقیت را تعریف کنید

ابتدا نشانهٔ رفتاری را بنویسید: «مشتری تازه می‌تواند دو طرح را مقایسه و یکی را انتخاب کند، بدون اینکه سراغ پشتیبانی برود.» این تعریف اجازه نمی‌دهد آزمون به مسابقهٔ زیبایی تبدیل شود.

### ۲. پیش از پرسیدن نظر، رفتار را ثبت کنید

اتمام تکلیف، زمان، کلیک اشتباه، مکث، بازگشت و درخواست کمک را ثبت کنید. سپس سراغ امتیاز و نظر بروید. این ترتیب، احتمال اینکه واکنش بصری تمام روایت جلسه را ببلعد کاهش می‌دهد.

### ۳. موارد هم‌سطح را مقایسه کنید

اگر سؤال دربارهٔ سبک بصری است، معماری اطلاعات و تعامل را ثابت نگه دارید. اگر سؤال دربارهٔ جریان کار است، طرح خام را با صفحهٔ آمادهٔ انتشار مقایسه نکنید؛ تفاوت میزان پرداخت، یک عامل مخدوش‌کنندهٔ آشکار است.

### ۴. پیگیری کنید، اما پاسخ را القا نکنید

به‌جای «آیا این طراحی کار را آسان کرد؟» بپرسید: «چه چیزی این مرحله را آسان یا دشوار کرد؟» به لحظهٔ مکث برگردید و از شرکت‌کننده بخواهید انتظارش را توضیح دهد.

### ۵. ادراک و عملکرد را جداگانه گزارش کنید

آن‌ها را در یک «امتیاز UX» حل نکنید. یک یافتهٔ دقیق می‌تواند چنین باشد: «شرکت‌کنندگان از نظام بصری آرام استقبال کردند؛ اما ۵ نفر از ۸ نفر کنترل مقایسهٔ طرح‌ها را ندیدند.» این جمله هم چیزی را که باید حفظ شود نشان می‌دهد و هم چیزی را که باید اصلاح شود.

### ۶. پس از فروکش کردن اثر نگاه اول، دوباره بسنجید

برای محصولی که بارها استفاده می‌شود، ترجیح در یک جلسه کافی نیست. بررسی کنید با افزایش آشنایی، وضوح، سرعت و نرخ خطا بهتر می‌شوند یا بدتر.

## زیبایی بخشی از کاربردپذیری است، نه مدرک آن

برداشت نادرست از این پژوهش آن است که رابط‌ها را عمداً ساده و بی‌جلوه کنیم. طراحی بصری سلسله‌مراتب می‌سازد، رابطه‌ها را توضیح می‌دهد و آمادگی عاطفی کاربر را شکل می‌دهد. این‌ها نقش‌های عملکردی‌اند.

پاسخ بهتر، مطالبهٔ هم‌زمان دو استاندارد است: محصول باید **منسجم احساس شود** و **شفاف رفتار کند**. زیبایی می‌تواند توجه و صبوری به دست آورد؛ طراحی تعامل باید این اعتماد را جبران کند.

وقتی شرکت‌کننده می‌گوید «خیلی زیباست»، آن را به‌عنوان شاهدی واقعی ثبت کنید—شاهدی دربارهٔ واکنش زیبایی‌شناختی. سپس به تکلیف برگردید: آیا رابط به او کمک کرد بفهمد، تصمیم بگیرد و از خطا برگردد؟ همین‌جا آسانی ادراک‌شده با واقعیت کاربردپذیر روبه‌رو می‌شود.

## منابع

۱. Kurosu, M., & Kashimura, K. (1995). [Apparent Usability vs. Inherent Usability](https://doi.org/10.1145/223355.223680). *CHI ’95 Conference Companion*, 292–293.

۲. Tractinsky, N., Katz, A. S., & Ikar, D. (2000). [What is beautiful is usable](https://doi.org/10.1016/S0953-5438(00)00031-X). *Interacting with Computers, 13*(2), 127–145.

۳. Sonderegger, A., & Sauer, J. (2010). [The influence of design aesthetics in usability testing](https://pubmed.ncbi.nlm.nih.gov/19892317/). *Applied Ergonomics, 41*(3), 403–410.

۴. Moran, K. (2024; reviewed 2026). [The Aesthetic–Usability Effect](https://www.nngroup.com/articles/aesthetic-usability-effect/). Nielsen Norman Group. تفسیر حرفه‌ای، نه پژوهش اولیه.

*یادداشت شواهد: ادعاهای این مقاله به متغیرهایی محدودند که پژوهش‌های بالا سنجیده‌اند. از آن‌ها باید برای طراحی بهتر آزمون استفاده کرد، نه به‌عنوان قانونی جهان‌شمول.*`;

export const firstResearchArticle = {
  id: "aesthetic-usability-effect",
  title: "When beautiful interfaces hide usability problems",
  excerpt: "What three decades of research say about the gap between perceived ease and actual performance.",
  category: "UX Research",
  date: "2026-09-30",
  coverImage,
  heroImage: coverImage,
  readingTime: { en: "9 min read", fa: "۹ دقیقه مطالعه" },
  evidenceLevel: "Research synthesis",
  blocks: [{ id: "article-en", type: "markdown", markdown: english }],
  translations: {
    en: {
      title: "When beautiful interfaces hide usability problems",
      excerpt: "What three decades of research say about the gap between perceived ease and actual performance.",
      category: "UX Research",
      blocks: [{ id: "article-en", type: "markdown", markdown: english }],
      imageAlt: "A polished interface panel floating above a tangled interaction system"
    },
    fa: {
      title: "وقتی رابط زیبا، مشکل کاربردپذیری را پنهان می‌کند",
      excerpt: "سه دهه پژوهش دربارهٔ فاصلهٔ میان آسانی ادراک‌شده و عملکرد واقعی چه می‌گوید؟",
      category: "پژوهش تجربهٔ کاربر",
      blocks: [{ id: "article-fa", type: "markdown", markdown: persian }],
      imageAlt: "سطح صیقلی یک رابط که بالای سامانه‌ای پیچیده و درهم قرار گرفته است"
    }
  }
};
