document.addEventListener("DOMContentLoaded", () => {
    const chatLauncher = document.getElementById("chatLauncher");
    const chatPanel = document.getElementById("chatPanel");
    const chatClose = document.getElementById("chatClose");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatSend = document.getElementById("chatSend");
    const chatMessages = document.getElementById("chatMessages");

    let conversationHistory = [];
    let isSending = false;
    let kb = null;
    let navStack = [];
    let selectedCourseId = null;
    let lastIntent = null;

    // ── Friendly Openers (rotated naturally) ─────────────────────
    const OPENERS = [
        "Sure!",
        "Absolutely!",
        "Great choice!",
        "Of course!",
        "Here's what I found.",
        "Let me help you with that.",
        "Here you go.",
        "Here's the information.",
        "Let's take a look.",
        "Here's what you need to know.",
    ];
    function opener() {
        return OPENERS[Math.floor(Math.random() * OPENERS.length)];
    }

    // ── Intent Keywords (English + Tamil/Tanglish) ───────────────
    const INTENTS = {
        courses: [
            "course", "courses", "program", "programs", "what do you offer",
            "what courses", "which courses", "show me courses", "all courses",
            "list of courses", "available courses", "what can i learn",
            "what do you teach", "tracks", "specializations",
            "enna courses", "enna program", "course irukka", "course irukku",
            "epa courses", "yaaru courses", "what courses la",
            "show courses", "browse courses",
        ],
        admission: [
            "admission", "apply", "application", "enroll", "enrollment",
            "how to join", "i want to join", "how do i join", "how to apply",
            "admission process", "application process", "registration",
            "how can i apply", "how to get admission", "how do i enroll",
            "join panrathu", "join panna", "admission epdi", "admission epadi",
            "apply panna", "apply epdi", "enrollment epdi", "register epdi",
            "epdi join", "epdi apply", "join pannanum",
        ],
        contact: [
            "contact", "phone", "email", "call", "whatsapp", "talk to",
            "talk to someone", "reach you", "support", "help me",
            "contact details", "contact info", "contact workskills",
            "how can i contact", "how can i reach", "get in touch",
            "phone number", "number", "contact panna", "contact epdi",
            "phone epdi", "call panna", "whatsapp irukka",
        ],
        fees: [
            "fee", "fees", "price", "cost", "how much", "payment",
            "pay", "expensive", "cheap", "affordable", "emi", "installment",
            "course fee", "course price", "course cost", "what is the fee",
            "how much does it cost", "can i pay online", "payment options",
            "fees evlo", "evlo cost", "evlo fee", "price evlo",
            "how much cost", "evlo", "cost evlo",
        ],
        eligibility: [
            "eligible", "eligibility", "who can join", "requirements",
            "prerequisite", "qualify", "qualification", "can i join",
            "am i eligible", "who is this for",
            "en paakalaam", "naan join panna mudiyuma",
            "eligible ah", "eligibility enna",
        ],
        placement: [
            "placement", "job", "career", "hired", "hire", "work",
            "employment", "salary", "package", "after course", "after training",
            "will i get a job", "career support", "placement assistance",
            "job assurance", "job assured", "what happens after",
            "placement irukka", "job kidaikuma", "placement support",
            "career support irukka",
        ],
        curriculum: [
            "curriculum", "syllabus", "modules", "topics", "what will i learn",
            "course content", "course structure", "what is taught",
            "syllabus enna", "modules enna", "epdi teach",
        ],
        projects: [
            "project", "projects", "live project", "real project", "portfolio",
            "practical", "hands-on", "capstone",
            "project irukka", "projects enna",
        ],
        certification: [
            "certification", "certificate", "certified", "iit certificate",
            "will i get a certificate", "what certificate",
            "certificate kidaikuma", "certification irukka",
        ],
        mentors: [
            "mentor", "instructor", "teacher", "faculty", "who teaches",
            "who will teach", "guide", "coaching",
            "yaar teach", "mentor irukka",
        ],
        tools: [
            "tools", "software", "technologies", "tech stack", "what tools",
            "what software", "what technologies",
            "tools enna", "software enna",
        ],
        campus: [
            "campus", "location", "where", "offline", "online", "batch",
            "timing", "schedule", "class", "venue",
            "campus enna", "location enna", "enga irukku",
        ],
        values: [
            "values", "mission", "vision", "about workskills", "who are you",
            "what is workskills", "tell me about workskills",
            "workskills enna", "neenga yaar",
        ],
        reviews: [
            "review", "rating", "feedback", "testimonials", "what do students say",
            "student reviews", "how is the quality",
            "review irukka", "rating enna",
        ],
        about: [
            "about", "who are you", "tell me about", "what is workskills",
            "worksksills enna", "neenga yaar", "about workskills",
        ],
        faq: [
            "faq", "faqs", "frequently asked", "common questions",
            "doubts", "questions", "enna doubt",
        ],
    };

    // ── Knowledge Base Loader ────────────────────────────────────
    async function loadKB() {
        if (kb) return kb;
        try {
            const res = await fetch("/api/knowledge");
            kb = await res.json();
            return kb;
        } catch {
            return null;
        }
    }

    // ── Context Resolution ───────────────────────────────────────
    function resolveContext(message) {
        const lower = message.toLowerCase().trim();
        if (selectedCourseId && /(it|this|the course|that|this one|ithu|adhu|that course|this course)/.test(lower)) {
            return selectedCourseId;
        }
        return null;
    }

    // ── Intent Detection ─────────────────────────────────────────
    function detectIntent(message) {
        const lower = message.toLowerCase().trim();
        const contextCourseId = resolveContext(message);

        if (kb && kb.courses_full) {
            for (const c of kb.courses_full) {
                const shortLower = c.short_name.toLowerCase();
                const nameLower = c.name.toLowerCase();
                if (lower.includes(shortLower) || lower.includes(nameLower)) {
                    if (/(fee|cost|price|evlo)/.test(lower)) return { type: "fees", courseId: c.id };
                    if (/(apply|admission|enroll|join|register|apply panna|join panna)/.test(lower)) return { type: "admission", courseId: c.id };
                    if (/(curriculum|syllabus|module|topics|enna teach)/.test(lower)) return { type: "curriculum", courseId: c.id };
                    if (/(skill|learn|taught|enna kathukalam)/.test(lower)) return { type: "skills", courseId: c.id };
                    if (/(project|portfolio)/.test(lower)) return { type: "projects", courseId: c.id };
                    if (/(certif|certificate)/.test(lower)) return { type: "certification", courseId: c.id };
                    if (/(eligible|eligibility|can i join|enna paakalaam)/.test(lower)) return { type: "eligibility", courseId: c.id };
                    if (/(mentor|instructor|teacher|yaar teach)/.test(lower)) return { type: "mentors", courseId: c.id };
                    return { type: "course_direct", courseId: c.id };
                }
            }
        }

        if (contextCourseId) {
            if (/(fee|cost|price|how much|evlo)/.test(lower)) return { type: "fees", courseId: contextCourseId };
            if (/(apply|admission|enroll|join)/.test(lower)) return { type: "admission", courseId: contextCourseId };
            if (/(curriculum|syllabus|module|topics)/.test(lower)) return { type: "curriculum", courseId: contextCourseId };
            if (/(skill|learn|taught)/.test(lower)) return { type: "skills", courseId: contextCourseId };
            if (/(project|portfolio)/.test(lower)) return { type: "projects", courseId: contextCourseId };
            if (/(certif)/.test(lower)) return { type: "certification", courseId: contextCourseId };
            return { type: "course_direct", courseId: contextCourseId };
        }

        const intentOrder = [
            "courses", "curriculum", "projects", "certification",
            "fees", "eligibility", "admission", "placement",
            "mentors", "tools", "campus", "reviews", "values", "about", "contact", "faq",
        ];

        for (const intent of intentOrder) {
            for (const kw of INTENTS[intent]) {
                if (lower.includes(kw)) {
                    return { type: intent };
                }
            }
        }

        return { type: "general" };
    }

    // ── DOM Helpers ──────────────────────────────────────────────
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addUserMessage(text) {
        const w = document.createElement("div");
        w.className = "chat-message user-message";
        const b = document.createElement("div");
        b.className = "message-bubble user-bubble";
        b.textContent = text;
        w.appendChild(b);
        chatMessages.appendChild(w);
        scrollToBottom();
    }

    function addBotText(text) {
        const w = document.createElement("div");
        w.className = "chat-message bot-message";
        const b = document.createElement("div");
        b.className = "message-bubble bot-bubble";
        b.textContent = text;
        w.appendChild(b);
        chatMessages.appendChild(w);
        scrollToBottom();
        return b;
    }

    function addBotHTML(html) {
        const w = document.createElement("div");
        w.className = "chat-message bot-message";
        const b = document.createElement("div");
        b.className = "bot-block";
        b.innerHTML = html;
        w.appendChild(b);
        chatMessages.appendChild(w);
        scrollToBottom();
        return b;
    }

    function addBotBlock() {
        const w = document.createElement("div");
        w.className = "chat-message bot-message";
        const b = document.createElement("div");
        b.className = "bot-block";
        w.appendChild(b);
        chatMessages.appendChild(w);
        scrollToBottom();
        return b;
    }

    function addTyping() {
        const w = document.createElement("div");
        w.className = "chat-message bot-message";
        w.id = "typingIndicator";
        const d = document.createElement("div");
        d.className = "typing-indicator";
        d.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        w.appendChild(d);
        chatMessages.appendChild(w);
        scrollToBottom();
    }

    function removeTyping() {
        const el = document.getElementById("typingIndicator");
        if (el) el.remove();
    }

    // ── Button Renderers ─────────────────────────────────────────
    function makeBtnGrid(parent, className) {
        const g = document.createElement("div");
        g.className = className;
        parent.appendChild(g);
        return g;
    }

    function addBtn(grid, label, onClick, cls) {
        const b = document.createElement("button");
        b.className = cls || "chat-action-btn";
        b.textContent = label;
        b.addEventListener("click", onClick);
        grid.appendChild(b);
        return b;
    }

    function addBtnGroupLabel(parent, text) {
        const l = document.createElement("p");
        l.className = "btn-group-label";
        l.textContent = text;
        parent.appendChild(l);
        return l;
    }

    function addBackBtn(parent, label, onClick) {
        const b = document.createElement("button");
        b.className = "chat-back-btn";
        b.textContent = label || "← Back";
        b.addEventListener("click", onClick);
        parent.appendChild(b);
        return b;
    }

    function addMainMenuBtn(parent) {
        const b = document.createElement("button");
        b.className = "chat-back-btn";
        b.textContent = "🏠 Main Menu";
        b.addEventListener("click", () => { navStack = []; showWelcome(); });
        parent.appendChild(b);
        return b;
    }

    function pushNav(fn) {
        navStack.push(fn);
    }

    function popNav() {
        if (navStack.length > 1) {
            navStack.pop();
            navStack[navStack.length - 1]();
        } else if (navStack.length === 1) {
            navStack = [];
            showWelcome();
        }
    }

    // ── Welcome Flow ─────────────────────────────────────────────
    function showWelcome() {
        const block = addBotBlock();
        const label = document.createElement("p");
        label.className = "bot-block-label";
        label.textContent = "How can I help you today?";
        block.appendChild(label);

        const grid = makeBtnGrid(block, "chat-btn-grid");
        addBtn(grid, "📚 Browse Courses", () => showCourses(), "chat-action-btn primary");
        addBtn(grid, "📝 How to Join", () => showAdmission(), "chat-action-btn");
        addBtn(grid, "💰 View Fees", () => showFeesOverview(), "chat-action-btn");
        addBtn(grid, "📞 Contact Us", () => showContact(), "chat-action-btn");
        addBtn(grid, "🎯 Career & Placement", () => showPlacement(), "chat-action-btn");
        addBtn(grid, "❓ FAQs", () => showFAQs(), "chat-action-btn");

        scrollToBottom();
    }

    // ── Courses ──────────────────────────────────────────────────
    async function showCourses() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data || !data.courses_full) {
            addBotText("Sorry, I couldn't load course information right now. Please try again in a moment.");
            return;
        }

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here are the courses currently available at Workskills.</strong><br>Choose a course to explore its details.`;
        block.appendChild(p);

        const grid = makeBtnGrid(block, "chat-btn-grid courses-grid");
        data.courses_full.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "chat-course-btn";
            btn.innerHTML = `<span class="course-btn-title">${c.short_name}</span><span class="course-btn-sub">${c.institute} · ₹${c.fee.toLocaleString("en-IN")}</span>`;
            btn.addEventListener("click", () => { selectedCourseId = c.id; showCourseDetail(c.id); });
            grid.appendChild(btn);
        });

        const nav = makeBtnGrid(block, "chat-btn-grid nav-grid");
        addBtn(nav, "💰 Fees Overview", () => showFeesOverview(), "chat-action-btn");
        addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showCourses());
        scrollToBottom();
    }

    // ── Course Detail ────────────────────────────────────────────
    async function showCourseDetail(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) { addBotText("Sorry, something went wrong. Please try again."); return; }

        const course = data.courses_full.find(c => c.id === courseId);
        if (!course) { addBotText("I couldn't find that course. Please choose from the list below."); return; }

        selectedCourseId = courseId;
        const analytics = data.analytics_program;
        const isDataAnalytics = courseId === "data-analytics";
        const detail = isDataAnalytics ? analytics : null;

        // Build the entire block using DOM methods (no innerHTML overwrite)
        const wrapper = document.createElement("div");
        wrapper.className = "chat-message bot-message";

        const block = document.createElement("div");
        block.className = "bot-block";

        // ── Overview Card ────────────────────────────────────────
        const card = document.createElement("div");
        card.className = "course-overview-card";

        const header = document.createElement("div");
        header.className = "course-ov-header";
        header.innerHTML = `<span class="course-ov-badge">${course.positioning}</span><span class="course-ov-inst">${course.institute}</span>`;
        card.appendChild(header);

        const name = document.createElement("h4");
        name.className = "course-ov-name";
        name.textContent = course.name;
        card.appendChild(name);

        const desc = document.createElement("p");
        desc.className = "course-ov-desc";
        desc.textContent = detail && detail.positioning
            ? `${detail.positioning} — comprehensive program with guaranteed internship and placement support.`
            : "IIT-certified program designed to build industry-ready skills with hands-on projects and placement assistance.";
        card.appendChild(desc);

        const meta = document.createElement("div");
        meta.className = "course-ov-meta";
        meta.innerHTML = `
            <div class="meta-chip"><span class="meta-chip-label">Duration</span><span class="meta-chip-val">${detail ? detail.duration.industrial_training_weeks + " weeks training + " + detail.duration.internship_live_project_weeks + " weeks internship" : "12–16 weeks"}</span></div>
            <div class="meta-chip"><span class="meta-chip-label">Fee</span><span class="meta-chip-val">₹${course.fee.toLocaleString("en-IN")}</span></div>
            ${course.emi && course.emi.installments ? `<div class="meta-chip"><span class="meta-chip-label">EMI</span><span class="meta-chip-val">₹${(course.emi.amount_inr || course.emi.amount || 0).toLocaleString("en-IN")} × ${course.emi.installments}</span></div>` : ""}
        `;
        card.appendChild(meta);
        block.appendChild(card);

        // ── Explore Group ────────────────────────────────────────
        const exploreLabel = document.createElement("p");
        exploreLabel.className = "btn-group-label";
        exploreLabel.textContent = "Explore";
        block.appendChild(exploreLabel);

        const exploreGrid = makeBtnGrid(block, "chat-btn-grid action-grid");
        if (isDataAnalytics) {
            addBtn(exploreGrid, "📚 Curriculum", () => showCurriculum(courseId), "chat-action-btn");
        }
        addBtn(exploreGrid, "🎯 Skills", () => showSkills(courseId), "chat-action-btn");
        addBtn(exploreGrid, "🚀 Projects", () => showProjects(courseId), "chat-action-btn");
        addBtn(exploreGrid, "🎓 Certification", () => showCertification(courseId), "chat-action-btn");

        // ── Join Group ───────────────────────────────────────────
        const joinLabel = document.createElement("p");
        joinLabel.className = "btn-group-label";
        joinLabel.textContent = "Join";
        block.appendChild(joinLabel);

        const joinGrid = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(joinGrid, "💰 Fees & EMI", () => showFeesDetail(courseId), "chat-action-btn");
        addBtn(joinGrid, "✅ Eligibility", () => showEligibility(courseId), "chat-action-btn");
        addBtn(joinGrid, "📝 Admission", () => showAdmissionForCourse(courseId), "chat-action-btn");
        addBtn(joinGrid, "🚀 Enroll Now", () => showEnroll(courseId), "chat-action-btn primary");

        // ── Help Group ───────────────────────────────────────────
        const helpLabel = document.createElement("p");
        helpLabel.className = "btn-group-label";
        helpLabel.textContent = "Need Help?";
        block.appendChild(helpLabel);

        const helpGrid = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(helpGrid, "📞 Contact Support", () => showContact(), "chat-action-btn");
        addBtn(helpGrid, "📚 All Courses", () => showCourses(), "chat-action-btn small");

        // ── Main Menu ────────────────────────────────────────────
        addMainMenuBtn(block);

        wrapper.appendChild(block);
        chatMessages.appendChild(wrapper);
        scrollToBottom();

        pushNav(() => showCourseDetail(courseId));
    }

    // ── Curriculum ───────────────────────────────────────────────
    async function showCurriculum(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) { addBotText("Sorry, something went wrong."); return; }

        const modules = data.analytics_program.curriculum;
        const course = data.courses_full.find(c => c.id === courseId);

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's the curriculum for ${course ? course.short_name : "Data Analytics"}.</strong><br>Select a module to see what you'll learn inside it.`;
        block.appendChild(p);

        const grid = makeBtnGrid(block, "module-btn-grid");
        modules.forEach((mod, idx) => {
            const btn = document.createElement("button");
            btn.className = "module-btn";
            btn.innerHTML = `<span class="module-num">${idx + 1}</span><span class="module-info"><span class="module-name">${mod.name}</span><span class="module-count">${mod.lesson_count} lessons</span></span>`;
            btn.addEventListener("click", () => showModuleDetail(courseId, idx));
            grid.appendChild(btn);
        });

        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));
        pushNav(() => showCurriculum(courseId));
        scrollToBottom();
    }

    async function showModuleDetail(courseId, moduleIndex) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const mod = data.analytics_program.curriculum[moduleIndex];
        const course = data.courses_full.find(c => c.id === courseId);
        const totalModules = data.analytics_program.curriculum.length;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>Module ${moduleIndex + 1} of ${totalModules} — ${mod.name}</strong>`;
        block.appendChild(p);

        const intro = document.createElement("p");
        intro.className = "bot-block-intro";
        intro.textContent = `In this module, you'll learn ${mod.lesson_count} key topics. Here's the breakdown:`;
        block.appendChild(intro);

        const list = document.createElement("div");
        list.className = "lesson-list";
        mod.lessons.forEach((lesson, i) => {
            const item = document.createElement("div");
            item.className = "lesson-item";
            item.innerHTML = `<span class="lesson-num">${i + 1}</span><span class="lesson-text">${lesson}</span>`;
            list.appendChild(item);
        });
        block.appendChild(list);

        const nav = makeBtnGrid(block, "chat-btn-grid nav-grid");
        if (moduleIndex < totalModules - 1) {
            addBtn(nav, `Next: Module ${moduleIndex + 2}`, () => showModuleDetail(courseId, moduleIndex + 1), "chat-action-btn");
        }
        addBtn(nav, "📚 All Modules", () => showCurriculum(courseId), "chat-action-btn");
        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));
        pushNav(() => showModuleDetail(courseId, moduleIndex));
        scrollToBottom();
    }

    // ── Skills ───────────────────────────────────────────────────
    async function showSkills(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const course = data.courses_full.find(c => c.id === courseId);
        const tools = data.tools;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here are the skills and tools you'll master in ${course ? course.short_name : "this course"}.</strong>`;
        block.appendChild(p);

        if (tools && tools.categories) {
            Object.entries(tools.categories).forEach(([cat, list]) => {
                const catName = cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                const catP = document.createElement("p");
                catP.className = "tool-cat-name";
                catP.textContent = catName;
                block.appendChild(catP);

                const tags = document.createElement("div");
                tags.className = "skill-tags";
                list.forEach(tool => {
                    const tag = document.createElement("span");
                    tag.className = "skill-tag";
                    tag.textContent = tool;
                    tags.appendChild(tag);
                });
                block.appendChild(tags);
            });
        }

        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));
        pushNav(() => showSkills(courseId));
        scrollToBottom();
    }

    // ── Projects ─────────────────────────────────────────────────
    async function showProjects(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const course = data.courses_full.find(c => c.id === courseId);
        const projects = data.live_projects;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} You'll work on ${projects.length} real-world projects${course ? " in " + course.short_name : ""}.</strong><br>Each project is designed to build your portfolio.`;
        block.appendChild(p);

        const list = document.createElement("div");
        list.className = "project-list";
        projects.forEach(proj => {
            const card = document.createElement("div");
            card.className = "project-card";
            card.innerHTML = `
                <div class="project-title">${proj.title}</div>
                <div class="project-meta">
                    ${proj.area ? `<span class="project-tag">${proj.area}</span>` : ""}
                    ${proj.difficulty ? `<span class="project-diff">${proj.difficulty}</span>` : ""}
                    ${proj.duration ? `<span class="project-dur">${proj.duration}</span>` : ""}
                </div>
                ${proj.guide ? `<div class="project-guide">Guide: ${proj.guide}</div>` : ""}
            `;
            list.appendChild(card);
        });
        block.appendChild(list);

        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));
        pushNav(() => showProjects(courseId));
        scrollToBottom();
    }

    // ── Certification ────────────────────────────────────────────
    async function showCertification(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const course = data.courses_full.find(c => c.id === courseId);
        const institutes = data.certifying_institutes;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's the certification detail for ${course ? course.short_name : "this course"}.</strong>`;
        block.appendChild(p);

        const certBox = document.createElement("div");
        certBox.className = "cert-box";
        certBox.innerHTML = `
            <div class="cert-icon">🎓</div>
            <div class="cert-content">
                <p class="cert-text">On completion, you receive an <strong>IIT-certified certification</strong> from ${course ? course.institute : "a premier IIT institute"}.</p>
                <p class="cert-sub">Certifying Institutes: ${institutes.join(", ")}</p>
                <p class="cert-note">These certifications are recognized by top employers across India.</p>
            </div>
        `;
        block.appendChild(certBox);

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "🚀 Enroll Now", () => showEnroll(courseId), "chat-action-btn primary");
        addBtn(nav, "💰 View Fees", () => showFeesDetail(courseId), "chat-action-btn");
        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));
        pushNav(() => showCertification(courseId));
        scrollToBottom();
    }

    async function showCertificationOverview() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) { addBotText("Sorry, something went wrong."); return; }

        const institutes = data.certifying_institutes;
        const whatGet = data.what_students_get;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} All Workskills programs come with IIT-certified certifications.</strong>`;
        block.appendChild(p);

        const certBox = document.createElement("div");
        certBox.className = "cert-box";
        let certHTML = `
            <div class="cert-icon">🎓</div>
            <div class="cert-content">
                <p class="cert-text">You'll receive certifications from <strong>${institutes.join(", ")}</strong> — India's premier institutions.</p>
        `;
        if (whatGet && whatGet.length > 0) {
            certHTML += `<p class="cert-note">You also get: ${whatGet.slice(0, 6).join(" · ")}</p>`;
        }
        certHTML += `</div>`;
        certBox.innerHTML = certHTML;
        block.appendChild(certBox);

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "📚 View Courses", () => showCourses(), "chat-action-btn primary");
        addBtn(nav, "📝 Admission", () => showAdmission(), "chat-action-btn");
        addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showCertificationOverview());
        scrollToBottom();
    }

    // ── Fees Overview ────────────────────────────────────────────
    async function showFeesOverview() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) { addBotText("Sorry, something went wrong."); return; }

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's the fee overview for all Workskills programs.</strong><br>Tap a course for full details.`;
        block.appendChild(p);

        const list = document.createElement("div");
        list.className = "fee-list";
        data.courses_full.forEach(c => {
            const card = document.createElement("div");
            card.className = "fee-card";
            card.innerHTML = `
                <div class="fee-card-header">
                    <span class="fee-card-name">${c.short_name}</span>
                    <span class="fee-card-inst">${c.institute}</span>
                </div>
                <div class="fee-card-body">
                    <span class="fee-card-price">₹${c.fee.toLocaleString("en-IN")}</span>
                    ${c.emi.installments ? `<span class="fee-card-emi">EMI: ₹${c.emi.amount_inr.toLocaleString("en-IN")} × ${c.emi.installments} months</span>` : ""}
                </div>
            `;
            card.style.cursor = "pointer";
            card.addEventListener("click", () => { selectedCourseId = c.id; showCourseDetail(c.id); });
            list.appendChild(card);
        });
        block.appendChild(list);

        const note = document.createElement("p");
        note.className = "fee-note";
        note.textContent = "All fees are current listed prices subject to change. Contact us for the latest pricing.";
        block.appendChild(note);

        const nav = makeBtnGrid(block, "chat-btn-grid nav-grid");
        addBtn(nav, "📝 Admission", () => showAdmission(), "chat-action-btn");
        addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showFeesOverview());
        scrollToBottom();
    }

    async function showFeesDetail(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const course = data.courses_full.find(c => c.id === courseId);
        if (!course) return;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Fee details for ${course.short_name}:</strong>`;
        block.appendChild(p);

        const box = document.createElement("div");
        box.className = "fee-detail-box";
        box.innerHTML = `
            <div class="fee-detail-row">
                <span class="fee-detail-label">Course Fee</span>
                <span class="fee-detail-val big">₹${course.fee.toLocaleString("en-IN")}</span>
            </div>
            ${course.emi.installments ? `
            <div class="fee-detail-row">
                <span class="fee-detail-label">EMI Option</span>
                <span class="fee-detail-val">₹${(course.emi.amount_inr || 0).toLocaleString("en-IN")} × ${course.emi.installments} months</span>
            </div>` : ""}
            <div class="fee-detail-note">Prices are subject to change. Contact us for the latest pricing.</div>
        `;
        block.appendChild(box);

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "📝 Admission Process", () => showAdmissionForCourse(courseId), "chat-action-btn");
        addBtn(nav, "🚀 Enroll Now", () => showEnroll(courseId), "chat-action-btn primary");
        addBackBtn(block, `← Back to ${course.short_name}`, () => showCourseDetail(courseId));

        pushNav(() => showFeesDetail(courseId));
        scrollToBottom();
    }

    // ── Admission ────────────────────────────────────────────────
    async function showAdmission() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) { addBotText("Sorry, something went wrong."); return; }

        const steps = data.admission_process;
        const claims = data.recruiter_claims;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's how the admission process works.</strong>`;
        block.appendChild(p);

        if (steps && steps.length > 0) {
            const stepList = document.createElement("div");
            stepList.className = "step-list";
            steps.forEach((step, i) => {
                const item = document.createElement("div");
                item.className = "step-item";
                item.innerHTML = `<span class="step-num">${i + 1}</span><span class="step-text">${step}</span>`;
                stepList.appendChild(item);
            });
            block.appendChild(stepList);
        }

        if (claims) {
            const info = document.createElement("div");
            info.className = "admission-info";
            info.innerHTML = `
                <div class="admission-stat"><strong>Shortlist turnaround:</strong> ${claims.shortlist_turnaround || "48 hours"}</div>
                <div class="admission-stat"><strong>Time to hire:</strong> ${claims.time_to_hire || "3–5 days"}</div>
            `;
            block.appendChild(info);
        }

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "🎓 Check Eligibility", () => showEligibility(), "chat-action-btn");
        addBtn(nav, "💰 View Fees", () => showFeesOverview(), "chat-action-btn");
        addBtn(nav, "🚀 Apply Now", () => showApplyNow(), "chat-action-btn primary");
        addBtn(nav, "📞 Contact Support", () => showContact(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showAdmission());
        scrollToBottom();
    }

    async function showAdmissionForCourse(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const course = data.courses_full.find(c => c.id === courseId);
        const steps = data.admission_process;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's how to apply for ${course ? course.short_name : "this course"}.</strong>`;
        block.appendChild(p);

        if (steps && steps.length > 0) {
            const stepList = document.createElement("div");
            stepList.className = "step-list";
            steps.forEach((step, i) => {
                const item = document.createElement("div");
                item.className = "step-item";
                item.innerHTML = `<span class="step-num">${i + 1}</span><span class="step-text">${step}</span>`;
                stepList.appendChild(item);
            });
            block.appendChild(stepList);
        }

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "🚀 Enroll Now", () => showEnroll(courseId), "chat-action-btn primary");
        addBtn(nav, "💰 View Fees", () => showFeesDetail(courseId), "chat-action-btn");
        addBtn(nav, "🎓 Eligibility", () => showEligibility(courseId), "chat-action-btn");
        addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");
        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));

        pushNav(() => showAdmissionForCourse(courseId));
        scrollToBottom();
    }

    // ── Eligibility ──────────────────────────────────────────────
    async function showEligibility(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const elig = data.analytics_program.eligibility;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's who can join the program.</strong>`;
        block.appendChild(p);

        if (elig) {
            const box = document.createElement("div");
            box.className = "eligibility-box";

            if (elig.degrees) {
                box.innerHTML += `<div class="elig-section"><strong>Accepted Degrees:</strong> ${elig.degrees.join(", ")}</div>`;
            }

            if (elig.audiences && elig.audiences.length > 0) {
                const audList = document.createElement("div");
                audList.className = "audience-list";
                elig.audiences.forEach(a => {
                    const item = document.createElement("div");
                    item.className = "audience-item";
                    item.innerHTML = `<span class="audience-type">${a.type}</span><span class="audience-detail">${a.detail}</span>`;
                    audList.appendChild(item);
                });
                box.appendChild(audList);
            }
            block.appendChild(box);
        }

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        if (courseId) {
            addBtn(nav, "📝 Admission Process", () => showAdmissionForCourse(courseId), "chat-action-btn");
            addBtn(nav, "💰 View Fees", () => showFeesDetail(courseId), "chat-action-btn");
            addBtn(nav, "🚀 Apply Now", () => showEnroll(courseId), "chat-action-btn primary");
            addBackBtn(block, `← Back to course`, () => showCourseDetail(courseId));
        } else {
            addBtn(nav, "📝 Admission Process", () => showAdmission(), "chat-action-btn");
            addBtn(nav, "💰 View Fees", () => showFeesOverview(), "chat-action-btn");
            addBtn(nav, "🚀 Apply Now", () => showApplyNow(), "chat-action-btn primary");
            addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");
            addMainMenuBtn(block);
        }

        pushNav(() => showEligibility(courseId));
        scrollToBottom();
    }

    // ── Enrollment / Apply ───────────────────────────────────────
    async function showEnroll(courseId) {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const course = data.courses_full.find(c => c.id === courseId);
        const pricing = data.analytics_program.pricing;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Ready to enroll in ${course ? course.short_name : "this course"}?</strong>`;
        block.appendChild(p);

        const box = document.createElement("div");
        box.className = "enroll-box";
        box.innerHTML = `
            <div class="enroll-row"><span class="enroll-label">Course Fee:</span><span class="enroll-val">₹${course ? course.fee.toLocaleString("en-IN") : ""}</span></div>
            ${course && course.emi.installments ? `<div class="enroll-row"><span class="enroll-label">EMI:</span><span class="enroll-val">₹${(course.emi.amount_inr || 0).toLocaleString("en-IN")} × ${course.emi.installments} months</span></div>` : ""}
            ${pricing && pricing.enrolment_amount_inr ? `<div class="enroll-row"><span class="enroll-label">Enrolment Amount:</span><span class="enroll-val">₹${pricing.enrolment_amount_inr.toLocaleString("en-IN")} + GST</span></div>` : ""}
            <div class="enroll-cta">
                <p>To enroll, visit <strong>program.workskills.in</strong> or call us at <strong>+91 8949655441</strong>.</p>
                <p class="enroll-note">You can also request a callback and our team will guide you.</p>
            </div>
        `;
        block.appendChild(box);

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "📞 Request Callback", () => showContact(), "chat-action-btn primary");
        addBtn(nav, "💰 Fees & EMI", () => showFeesDetail(courseId), "chat-action-btn");
        addBtn(nav, "📝 Admission Process", () => showAdmissionForCourse(courseId), "chat-action-btn");
        addBackBtn(block, `← Back to ${course ? course.short_name : "course"}`, () => showCourseDetail(courseId));

        pushNav(() => showEnroll(courseId));
        scrollToBottom();
    }

    async function showApplyNow() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's how to start your application.</strong>`;
        block.appendChild(p);

        const box = document.createElement("div");
        box.className = "apply-box";
        box.innerHTML = `
            <p>Visit <strong>program.workskills.in</strong> to start your application.</p>
            <p>Or call us at <strong>+91 8949655441</strong> — our team will guide you through every step.</p>
            <p class="apply-note">You can also click "Request Callback" below and we'll reach out to you.</p>
        `;
        block.appendChild(box);

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "📞 Request Callback", () => showContact(), "chat-action-btn primary");
        addBtn(nav, "🎓 Check Eligibility", () => showEligibility(), "chat-action-btn");
        addBtn(nav, "📚 View Courses", () => showCourses(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showApplyNow());
        scrollToBottom();
    }

    // ── Contact ──────────────────────────────────────────────────
    async function showContact() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) { addBotText("Sorry, something went wrong."); return; }

        const contact = data.contact;
        const homepage = contact.homepage || {};
        const about = contact.about_campus_hire_pages || {};

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's how you can reach the Workskills team.</strong><br>Choose the method you'd prefer:`;
        block.appendChild(p);

        const box = document.createElement("div");
        box.className = "contact-box";

        let html = "";
        if (homepage.phone || about.phone) {
            html += `<div class="contact-row"><span class="contact-icon">📞</span><div class="contact-info">`;
            if (homepage.phone) html += `<div class="contact-val">${homepage.phone}</div>`;
            if (about.phone && about.phone !== homepage.phone) html += `<div class="contact-val small">${about.phone} (Campus)</div>`;
            html += `</div></div>`;
        }
        if (homepage.email || about.email) {
            html += `<div class="contact-row"><span class="contact-icon">✉️</span><div class="contact-info">`;
            if (homepage.email) html += `<div class="contact-val">${homepage.email}</div>`;
            if (about.email && about.email !== homepage.email) html += `<div class="contact-val small">${about.email} (Campus)</div>`;
            html += `</div></div>`;
        }
        if (homepage.address || about.address) {
            html += `<div class="contact-row"><span class="contact-icon">📍</span><div class="contact-info">`;
            if (homepage.address) html += `<div class="contact-val">${homepage.address}</div>`;
            if (about.address && about.address !== homepage.address) html += `<div class="contact-val small">${about.address} (Campus)</div>`;
            html += `</div></div>`;
        }

        if (contact.discrepancy_warning) {
            html += `<div class="contact-note">Note: ${contact.discrepancy_warning}</div>`;
        }

        box.innerHTML = html;
        block.appendChild(box);

        const nav = makeBtnGrid(block, "chat-btn-grid nav-grid");
        addBtn(nav, "📚 Courses", () => showCourses(), "chat-action-btn");
        addBtn(nav, "📝 Admission", () => showAdmission(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showContact());
        scrollToBottom();
    }

    // ── Placement / Career ───────────────────────────────────────
    async function showPlacement() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const stats = data.stats;
        const career = data.career_path;
        const whatGet = data.what_students_get;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's what happens after your training.</strong>`;
        block.appendChild(p);

        const box = document.createElement("div");
        box.className = "placement-box";

        let html = `<div class="placement-stats">`;
        html += `<div class="p-stat"><span class="p-stat-num">${stats.students_placed}</span><span class="p-stat-label">Students Placed</span></div>`;
        html += `<div class="p-stat"><span class="p-stat-num">${stats.placement_assistance}</span><span class="p-stat-label">Placement Assistance</span></div>`;
        html += `<div class="p-stat"><span class="p-stat-num">${stats.hiring_companies}</span><span class="p-stat-label">Hiring Companies</span></div>`;
        html += `<div class="p-stat"><span class="p-stat-num">${stats.avg_package}</span><span class="p-stat-label">Avg Package</span></div>`;
        html += `</div>`;

        if (career) {
            html += `<div class="placement-section"><strong>Our Model:</strong> ${career.learn || ""} → ${career.intern || ""} → ${career.get_placed || ""}</div>`;
        }

        if (whatGet && whatGet.length > 0) {
            html += `<div class="placement-section"><strong>What You Get:</strong></div>`;
            html += `<div class="what-get-tags">`;
            whatGet.forEach(item => {
                html += `<span class="what-get-tag">${item}</span>`;
            });
            html += `</div>`;
        }

        html += `<div class="placement-note">All placement numbers are Workskills website claims, not independently verified.</div>`;

        box.innerHTML = html;
        block.appendChild(box);

        const nav = makeBtnGrid(block, "chat-btn-grid action-grid");
        addBtn(nav, "📚 View Courses", () => showCourses(), "chat-action-btn primary");
        addBtn(nav, "💰 View Fees", () => showFeesOverview(), "chat-action-btn");
        addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showPlacement());
        scrollToBottom();
    }

    // ── Mentors ──────────────────────────────────────────────────
    async function showMentors() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const guides = data.project_guides;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here are the project guides and mentors.</strong>`;
        block.appendChild(p);

        if (guides && guides.length > 0) {
            const list = document.createElement("div");
            list.className = "mentor-list";
            guides.forEach(g => {
                const card = document.createElement("div");
                card.className = "mentor-card";
                card.innerHTML = `
                    <div class="mentor-avatar">${g.name.charAt(0)}</div>
                    <div class="mentor-info">
                        <div class="mentor-name">${g.name}</div>
                        <div class="mentor-role">${g.role}</div>
                        <div class="mentor-projects">Projects: ${g.projects.join(", ")}</div>
                    </div>
                `;
                list.appendChild(card);
            });
            block.appendChild(list);
        } else {
            addBotText("Mentor details will be shared during the program enrollment.");
        }

        addBackBtn(block, "← Back", () => navStack.length > 1 ? popNav() : showGlobalNav());
        pushNav(() => showMentors());
        scrollToBottom();
    }

    // ── Tools ────────────────────────────────────────────────────
    async function showAllSkills() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const tools = data.tools;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} You'll master ${tools ? tools.advertised_total || "50+" : ""}+ tools and technologies.</strong>`;
        block.appendChild(p);

        if (tools && tools.categories) {
            Object.entries(tools.categories).forEach(([cat, list]) => {
                const catName = cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                const catP = document.createElement("p");
                catP.className = "tool-cat-name";
                catP.textContent = catName;
                block.appendChild(catP);

                const tags = document.createElement("div");
                tags.className = "skill-tags";
                list.forEach(tool => {
                    const tag = document.createElement("span");
                    tag.className = "skill-tag";
                    tag.textContent = tool;
                    tags.appendChild(tag);
                });
                block.appendChild(tags);
            });
        }

        addBackBtn(block, "← Back", () => navStack.length > 1 ? popNav() : showGlobalNav());
        pushNav(() => showAllSkills());
        scrollToBottom();
    }

    // ── Projects (all) ──────────────────────────────────────────
    async function showAllProjects() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const projects = data.live_projects;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here are all the live projects you'll work on.</strong>`;
        block.appendChild(p);

        const list = document.createElement("div");
        list.className = "project-list";
        projects.forEach(proj => {
            const card = document.createElement("div");
            card.className = "project-card";
            card.innerHTML = `
                <div class="project-title">${proj.title}</div>
                <div class="project-meta">
                    ${proj.area ? `<span class="project-tag">${proj.area}</span>` : ""}
                    ${proj.difficulty ? `<span class="project-diff">${proj.difficulty}</span>` : ""}
                    ${proj.duration ? `<span class="project-dur">${proj.duration}</span>` : ""}
                </div>
                ${proj.goal ? `<div class="project-goal">${proj.goal}</div>` : ""}
                ${proj.guide ? `<div class="project-guide">Guide: ${proj.guide}</div>` : ""}
            `;
            list.appendChild(card);
        });
        block.appendChild(list);

        addBackBtn(block, "← Back", () => navStack.length > 1 ? popNav() : showGlobalNav());
        pushNav(() => showAllProjects());
        scrollToBottom();
    }

    // ── Campus ───────────────────────────────────────────────────
    async function showCampus() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const campus = data.campus;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's what campus life looks like at Workskills.</strong>`;
        block.appendChild(p);

        if (campus) {
            const box = document.createElement("div");
            box.className = "campus-box";
            let html = "";
            if (campus.location) html += `<div class="campus-row"><strong>Location:</strong> ${campus.location}</div>`;
            if (campus.features && campus.features.length > 0) {
                html += `<div class="campus-features">`;
                campus.features.forEach(f => { html += `<span class="campus-feature-tag">${f}</span>`; });
                html += `</div>`;
            }
            if (campus.typical_learning_flow) {
                html += `<div class="campus-section"><strong>Typical Learning Flow:</strong></div><ol class="campus-flow">`;
                campus.typical_learning_flow.forEach(step => { html += `<li>${step}</li>`; });
                html += `</ol>`;
            }
            if (campus.typical_completion_time) html += `<div class="campus-row"><strong>Completion Time:</strong> ${campus.typical_completion_time}</div>`;
            box.innerHTML = html;
            block.appendChild(box);
        }

        addBackBtn(block, "← Back", () => navStack.length > 1 ? popNav() : showGlobalNav());
        pushNav(() => showCampus());
        scrollToBottom();
    }

    // ── About / Values ──────────────────────────────────────────
    async function showAbout() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const identity = data.identity;
        const about = data.about;
        const values = data.values;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's a bit about Workskills X.</strong>`;
        block.appendChild(p);

        const box = document.createElement("div");
        box.className = "about-box";
        let html = "";
        if (identity) {
            html += `<div class="about-row"><strong>${identity.primary_positioning || ""}</strong></div>`;
            if (identity.tagline_journey) html += `<div class="about-row">${identity.tagline_journey}</div>`;
            if (identity.description) html += `<div class="about-desc">${identity.description}</div>`;
            if (identity.founders_background) html += `<div class="about-row"><strong>Founded by:</strong> ${identity.founders_background}</div>`;
        }
        if (about) {
            if (about.origin_story) html += `<div class="about-row">${about.origin_story}</div>`;
            if (about.session_format) html += `<div class="about-row"><strong>Session Format:</strong> ${about.session_format}</div>`;
            if (about.mission_statement) html += `<div class="about-row"><strong>Mission:</strong> ${about.mission_statement}</div>`;
        }
        box.innerHTML = html;
        block.appendChild(box);

        if (values && values.length > 0) {
            const vp = document.createElement("p");
            vp.className = "bot-block-label";
            vp.textContent = "Our Values:";
            block.appendChild(vp);
            const vList = document.createElement("div");
            vList.className = "values-list";
            values.forEach(v => {
                const item = document.createElement("div");
                item.className = "value-item";
                item.innerHTML = `<span class="value-name">${v.name}</span><span class="value-theme">${v.theme}</span>`;
                vList.appendChild(item);
            });
            block.appendChild(vList);
        }

        addBackBtn(block, "← Back", () => navStack.length > 1 ? popNav() : showGlobalNav());
        pushNav(() => showAbout());
        scrollToBottom();
    }

    // ── Reviews ──────────────────────────────────────────────────
    async function showReviews() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const reviews = data.reviews;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here's what students are saying.</strong>`;
        block.appendChild(p);

        if (reviews) {
            const box = document.createElement("div");
            box.className = "reviews-box";
            let html = "";
            if (reviews.rating) {
                html += `<div class="review-rating"><span class="review-stars">⭐</span><span class="review-num">${reviews.rating}</span><span class="review-count">(${reviews.count || "3,500+"} ratings)</span></div>`;
            }
            if (reviews.examples && reviews.examples.length > 0) {
                html += `<div class="review-examples">`;
                reviews.examples.slice(0, 3).forEach(r => {
                    html += `<div class="review-item"><div class="review-name">${r.name} ${r.verified ? "✓" : ""}</div><div class="review-summary">${r.summary}</div></div>`;
                });
                html += `</div>`;
            }
            html += `<div class="review-note">Reviews are user-generated testimonials, not independently verified outcomes.</div>`;
            box.innerHTML = html;
            block.appendChild(box);
        }

        addBackBtn(block, "← Back", () => navStack.length > 1 ? popNav() : showGlobalNav());
        pushNav(() => showReviews());
        scrollToBottom();
    }

    // ── FAQs ─────────────────────────────────────────────────────
    async function showFAQs() {
        addTyping();
        const data = await loadKB();
        removeTyping();
        if (!data) return;

        const block = addBotBlock();
        const p = document.createElement("p");
        p.className = "bot-block-label";
        p.innerHTML = `<strong>${opener()} Here are some commonly asked questions.</strong>`;
        block.appendChild(p);

        const faqs = [
            { q: "What programs does Workskills offer?", a: () => { showCourses(); return true; } },
            { q: "What is the fee structure?", a: () => { showFeesOverview(); return true; } },
            { q: "How do I apply?", a: () => { showAdmission(); return true; } },
            { q: "What certifications do I get?", a: "You receive IIT-certified certifications from institutes like IIT Patna, IIT Bombay, and IIT Guwahati upon successful completion." },
            { q: "Is there placement assistance?", a: "Yes — Workskills provides 100% placement assistance with 500+ hiring companies. The model is: Learn → Intern → Get Placed." },
            { q: "Can I pay in EMI?", a: "Yes, all programs offer EMI options ranging from ₹2,109 to ₹5,717 per month depending on the course." },
            { q: "Who are the instructors?", a: () => { showMentors(); return true; } },
            { q: "What tools will I learn?", a: () => { showAllSkills(); return true; } },
            { q: "What are the live projects?", a: () => { showAllProjects(); return true; } },
            { q: "Where is the campus?", a: "The Workskills campus is located in Jaipur, Rajasthan. It's an offline, small-batch learning environment." },
            { q: "What are the contact details?", a: () => { showContact(); return true; } },
        ];

        const list = document.createElement("div");
        list.className = "faq-list";
        faqs.forEach(faq => {
            const item = document.createElement("div");
            item.className = "faq-item";
            const isAction = typeof faq.a === "function";

            const qDiv = document.createElement("div");
            qDiv.className = "faq-q";
            qDiv.textContent = `Q: ${faq.q}`;
            item.appendChild(qDiv);

            if (!isAction) {
                const aDiv = document.createElement("div");
                aDiv.className = "faq-a";
                aDiv.textContent = `A: ${faq.a}`;
                item.appendChild(aDiv);
            } else {
                const aBtn = document.createElement("button");
                aBtn.className = "faq-link-btn";
                aBtn.textContent = "Show answer →";
                aBtn.addEventListener("click", faq.a);
                item.appendChild(aBtn);
            }

            list.appendChild(item);
        });
        block.appendChild(list);

        const nav = makeBtnGrid(block, "chat-btn-grid nav-grid");
        addBtn(nav, "📚 Courses", () => showCourses(), "chat-action-btn");
        addBtn(nav, "📞 Contact", () => showContact(), "chat-action-btn");

        addMainMenuBtn(block);
        pushNav(() => showFAQs());
        scrollToBottom();
    }

    // ── Main Message Handler ─────────────────────────────────────
    async function handleMessage(message) {
        if (isSending || !message.trim()) return;
        isSending = true;
        chatSend.disabled = true;

        addUserMessage(message);
        chatInput.value = "";

        const intent = detectIntent(message);
        lastIntent = intent;

        if (intent.type !== "general") {
            addTyping();
            await loadKB();
            removeTyping();

            switch (intent.type) {
                case "courses": showCourses(); break;
                case "course_direct": showCourseDetail(intent.courseId || selectedCourseId); break;
                case "curriculum": showCurriculum(intent.courseId || selectedCourseId || "data-analytics"); break;
                case "projects": showProjects(intent.courseId || selectedCourseId || "data-analytics"); break;
                case "certification": intent.courseId ? showCertification(intent.courseId) : showCertificationOverview(); break;
                case "skills": showSkills(intent.courseId || selectedCourseId || "data-analytics"); break;
                case "fees": intent.courseId ? showFeesDetail(intent.courseId) : showFeesOverview(); break;
                case "admission": intent.courseId ? showAdmissionForCourse(intent.courseId) : showAdmission(); break;
                case "eligibility": showEligibility(intent.courseId || selectedCourseId); break;
                case "contact": showContact(); break;
                case "placement": showPlacement(); break;
                case "mentors": showMentors(); break;
                case "tools": showAllSkills(); break;
                case "campus": showCampus(); break;
                case "values": case "about": showAbout(); break;
                case "reviews": showReviews(); break;
                case "faq": showFAQs(); break;
                default: showWelcome(); break;
            }

            conversationHistory.push({ role: "user", parts: [{ text: message }] });
            conversationHistory.push({ role: "model", parts: [{ text: `[Interactive: ${intent.type}]` }] });
            if (conversationHistory.length > 40) conversationHistory = conversationHistory.slice(-40);
        } else {
            addTyping();
            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message, history: conversationHistory }),
                });
                const data = await response.json();
                removeTyping();
                const reply = data.reply || "Sorry, something went wrong. Please try again.";
                addBotText(reply);

                conversationHistory.push({ role: "user", parts: [{ text: message }] });
                conversationHistory.push({ role: "model", parts: [{ text: reply }] });
                if (conversationHistory.length > 40) conversationHistory = conversationHistory.slice(-40);
            } catch {
                removeTyping();
                addBotText("Sorry, I'm having trouble connecting. Please try again later.");
            }
        }

        isSending = false;
        chatSend.disabled = false;
        chatInput.focus();
    }

    // ── Welcome Buttons Initialization ───────────────────────────
    function initWelcomeButtons() {
        const container = document.getElementById("welcomeButtons");
        if (!container) return;
        const grid = container.querySelector(".chat-btn-grid");
        if (!grid) return;

        const welcomeItems = [
            { label: "📚 Browse Courses", msg: "show courses", primary: true },
            { label: "📝 How to Join", msg: "how to join" },
            { label: "💰 View Fees", msg: "fees" },
            { label: "📞 Contact Us", msg: "contact" },
            { label: "🎯 Career & Placement", msg: "placement" },
            { label: "❓ FAQs", msg: "faq" },
        ];

        welcomeItems.forEach(item => {
            const btn = document.createElement("button");
            btn.className = item.primary ? "chat-action-btn primary" : "chat-action-btn";
            btn.textContent = item.label;
            btn.addEventListener("click", () => handleMessage(item.msg));
            grid.appendChild(btn);
        });
    }

    // ── Event Listeners ──────────────────────────────────────────
    function toggleChat() {
        const isHidden = chatPanel.classList.contains("d-none");
        if (isHidden) {
            chatPanel.classList.remove("d-none");
            chatLauncher.style.display = "none";
            chatInput.focus();
        } else {
            chatPanel.classList.add("d-none");
            chatLauncher.style.display = "flex";
        }
    }

    chatLauncher.addEventListener("click", toggleChat);
    chatClose.addEventListener("click", toggleChat);
    chatForm.addEventListener("submit", (e) => { e.preventDefault(); handleMessage(chatInput.value); });
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleMessage(chatInput.value); } });

    // Initialize welcome buttons
    initWelcomeButtons();
});
