document.addEventListener("DOMContentLoaded", () => {
    // Cache admin collections
    let studentsList = [];
    let noticesList = [];
    let examsList = [];
    let syllabusList = [];
    let faqsList = [];

    // --- Admin Page Navigation ---
    const adminButtons = document.querySelectorAll("[data-admin-tab]");
    const adminSections = document.querySelectorAll(".admin-panel-section");
    const adminTitle = document.getElementById("admin-page-title");
    const adminSubtitle = document.getElementById("admin-page-subtitle");

    const sectionHeaders = {
        students: { title: "Manage Student Records", desc: "Configure database information and edit student parameters" },
        notices: { title: "Notice Board Settings", desc: "Post official announcements and alert badges for the campus" },
        exams: { title: "Exam Schedule Timetable", desc: "Draft exam dates, rooms, and schedule upcoming papers" },
        syllabus: { title: "Syllabus Resource Manager", desc: "Build subject maps, resource links, and study tracks per department" },
        faqs: { title: "FAQ Database Controls", desc: "Configure answers to common questions answered by the AI bot" }
    };

    adminButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-admin-tab");
            
            adminButtons.forEach(b => b.classList.remove("active"));
            adminSections.forEach(s => s.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`admin-panel-${target}`).classList.add("active");
            
            adminTitle.textContent = sectionHeaders[target].title;
            adminSubtitle.textContent = sectionHeaders[target].desc;

            // Reset edit sections when switching panels
            hideEditBox();
            
            // Reload all admin records
            loadAdminData();
        });
    });

    // --- Toast Notifications Helper ---
    function showToast(message, isError = false) {
        const toast = document.getElementById("toast-notify");
        const toastMsg = document.getElementById("toast-msg");
        const toastIcon = document.getElementById("toast-icon");
        
        toastMsg.textContent = message;
        
        if (isError) {
            toast.classList.remove("success");
            toast.classList.add("error");
            toastIcon.className = "fa-solid fa-circle-exclamation";
        } else {
            toast.classList.remove("error");
            toast.classList.add("success");
            toastIcon.className = "fa-solid fa-circle-check";
        }
        
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    // --- Load Data from API ---
    function loadAdminData() {
        fetch("/api/admin/dashboard")
            .then(res => res.json())
            .then(data => {
                studentsList = data.students || [];
                noticesList = data.notices || [];
                examsList = data.exams || [];
                syllabusList = data.syllabus || [];
                faqsList = data.faqs || [];

                renderStudentsTable();
                renderNoticesTable();
                renderExamsTable();
                renderSyllabusTable();
                renderFAQsTable();
            })
            .catch(err => {
                console.error(err);
                showToast("Failed to connect to administrative server", true);
            });
    }

    // --- Render Tables Helper Functions ---

    function renderStudentsTable() {
        const tbody = document.getElementById("admin-students-table-body");
        tbody.innerHTML = "";
        
        studentsList.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${s.full_name}</strong></td>
                <td><code>${s.roll_number}</code></td>
                <td>${s.course}</td>
                <td>${s.semester}</td>
                <td><span class="action-badge" style="background: ${s.attendance_pct >= 75 ? 'rgba(16,185,129,0.1); color: var(--success);' : 'rgba(239,68,68,0.1); color: var(--danger);'}">${s.attendance_pct}%</span></td>
                <td>$${s.fees_paid.toLocaleString()}</td>
                <td>$${s.fees_due.toLocaleString()}</td>
                <td>
                    <button class="action-btn edit" data-id="${s.id}" title="Edit Profile"><i class="fa-solid fa-user-gear"></i></button>
                </td>
            `;

            // Attach edit handler
            tr.querySelector(".edit").addEventListener("click", () => showEditBox(s));
            tbody.appendChild(tr);
        });
    }

    function renderNoticesTable() {
        const tbody = document.getElementById("admin-notices-table-body");
        tbody.innerHTML = "";
        
        noticesList.forEach(n => {
            const tr = document.createElement("tr");
            
            const dateObj = new Date(n.date_posted);
            const formattedDate = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td><span class="notice-tag ${n.category}" style="font-size: 0.75rem;">${n.category}</span></td>
                <td><strong>${n.title}</strong></td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.content}</td>
                <td>
                    <button class="action-btn delete" data-id="${n.id}" title="Delete Notice"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;

            tr.querySelector(".delete").addEventListener("click", () => deleteNotice(n.id));
            tbody.appendChild(tr);
        });
    }

    function renderExamsTable() {
        const tbody = document.getElementById("admin-exams-table-body");
        tbody.innerHTML = "";
        
        examsList.forEach(e => {
            const tr = document.createElement("tr");
            const dateObj = new Date(e.exam_date);
            const formattedDate = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

            tr.innerHTML = `
                <td><strong>${e.subject}</strong></td>
                <td>${formattedDate}</td>
                <td>${e.time}</td>
                <td><code>${e.room}</code></td>
                <td>
                    <button class="action-btn delete" data-id="${e.id}" title="Cancel Exam"><i class="fa-solid fa-calendar-minus"></i></button>
                </td>
            `;

            tr.querySelector(".delete").addEventListener("click", () => deleteExam(e.id));
            tbody.appendChild(tr);
        });
    }

    function renderSyllabusTable() {
        const tbody = document.getElementById("admin-syllabus-table-body");
        tbody.innerHTML = "";
        
        syllabusList.forEach(s => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${s.course}</td>
                <td>${s.semester}</td>
                <td><strong>${s.subject}</strong></td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.topics}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.resources || ''}</td>
                <td>
                    <button class="action-btn edit" data-id="${s.id}" title="Edit Syllabus"><i class="fa-solid fa-pen-to-square"></i></button>
                </td>
            `;

            tr.querySelector(".edit").addEventListener("click", () => loadSyllabusToForm(s));
            tbody.appendChild(tr);
        });
    }

    function renderFAQsTable() {
        const tbody = document.getElementById("admin-faqs-table-body");
        tbody.innerHTML = "";
        
        faqsList.forEach(f => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="notice-tag ${f.category}" style="font-size: 0.75rem;">${f.category}</span></td>
                <td><strong>${f.question}</strong></td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.answer}</td>
                <td>
                    <button class="action-btn edit" data-id="${f.id}" title="Edit FAQ" style="margin-right: 5px;"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete" data-id="${f.id}" title="Delete FAQ"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;

            tr.querySelector(".edit").addEventListener("click", () => loadFAQToForm(f));
            tr.querySelector(".delete").addEventListener("click", () => deleteFAQ(f.id));
            tbody.appendChild(tr);
        });
    }

    // --- Actions/CRUD Logic Functions ---

    // Edit Student Details UI Toggle
    window.showEditBox = function(student) {
        document.getElementById("edit-stud-id").value = student.id;
        document.getElementById("edit-stud-name").value = student.full_name;
        document.getElementById("edit-stud-roll").value = student.roll_number;
        document.getElementById("edit-stud-course").value = student.course;
        document.getElementById("edit-stud-semester").value = student.semester;
        document.getElementById("edit-stud-attendance").value = student.attendance_pct;
        document.getElementById("edit-stud-paid").value = student.fees_paid;
        document.getElementById("edit-stud-due").value = student.fees_due;
        
        const box = document.getElementById("edit-student-box");
        box.style.display = "block";
        box.scrollIntoView({ behavior: "smooth" });
    };

    window.hideEditBox = function() {
        document.getElementById("edit-student-box").style.display = "none";
        document.getElementById("edit-student-form").reset();
    };

    // Save Student edit
    document.getElementById("edit-student-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = {
            id: document.getElementById("edit-stud-id").value,
            full_name: document.getElementById("edit-stud-name").value,
            roll_number: document.getElementById("edit-stud-roll").value,
            course: document.getElementById("edit-stud-course").value,
            semester: document.getElementById("edit-stud-semester").value,
            attendance_pct: parseFloat(document.getElementById("edit-stud-attendance").value),
            fees_paid: parseFloat(document.getElementById("edit-stud-paid").value),
            fees_due: parseFloat(document.getElementById("edit-stud-due").value)
        };

        fetch("/api/admin/student/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Student profile parameters updated!");
                hideEditBox();
                loadAdminData();
            } else {
                showToast("Error updating student data", true);
            }
        });
    });

    // Post Notice Board
    document.getElementById("add-notice-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById("notice-title-in").value,
            category: document.getElementById("notice-category-in").value,
            content: document.getElementById("notice-content-in").value
        };

        fetch("/api/admin/notices/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Notice posted successfully!");
                document.getElementById("add-notice-form").reset();
                loadAdminData();
            } else {
                showToast(data.error || "Failed to post notice", true);
            }
        });
    });

    function deleteNotice(id) {
        if (!confirm("Are you sure you want to delete this notice?")) return;
        
        fetch("/api/admin/notices/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Notice deleted.");
                loadAdminData();
            } else {
                showToast("Failed to delete notice", true);
            }
        });
    }

    // Exam scheduling
    document.getElementById("add-exam-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = {
            subject: document.getElementById("exam-subject-in").value,
            exam_date: document.getElementById("exam-date-in").value,
            time: document.getElementById("exam-time-in").value,
            room: document.getElementById("exam-room-in").value
        };

        fetch("/api/admin/exams/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Exam scheduled successfully!");
                document.getElementById("add-exam-form").reset();
                loadAdminData();
            } else {
                showToast(data.error || "Failed to schedule exam", true);
            }
        });
    });

    function deleteExam(id) {
        if (!confirm("Are you sure you want to cancel this scheduled exam?")) return;
        
        fetch("/api/admin/exams/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Exam schedule cancelled.");
                loadAdminData();
            } else {
                showToast("Failed to delete schedule", true);
            }
        });
    }

    // Syllabus Management
    function loadSyllabusToForm(item) {
        document.getElementById("syllabus-id-in").value = item.id;
        document.getElementById("syllabus-course-in").value = item.course;
        document.getElementById("syllabus-semester-in").value = item.semester;
        document.getElementById("syllabus-subject-in").value = item.subject;
        document.getElementById("syllabus-topics-in").value = item.topics;
        document.getElementById("syllabus-resources-in").value = item.resources || '';
        document.getElementById("add-syllabus-form").scrollIntoView({ behavior: "smooth" });
    }

    document.getElementById("add-syllabus-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = {
            id: document.getElementById("syllabus-id-in").value || null,
            course: document.getElementById("syllabus-course-in").value,
            semester: document.getElementById("syllabus-semester-in").value,
            subject: document.getElementById("syllabus-subject-in").value,
            topics: document.getElementById("syllabus-topics-in").value,
            resources: document.getElementById("syllabus-resources-in").value
        };

        fetch("/api/admin/syllabus/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Syllabus resource saved!");
                document.getElementById("add-syllabus-form").reset();
                document.getElementById("syllabus-id-in").value = "";
                loadAdminData();
            } else {
                showToast(data.error || "Failed to save syllabus data", true);
            }
        });
    });

    // FAQ settings
    function loadFAQToForm(faq) {
        document.getElementById("faq-id-in").value = faq.id;
        document.getElementById("faq-question-in").value = faq.question;
        document.getElementById("faq-category-in").value = faq.category;
        document.getElementById("faq-answer-in").value = faq.answer;
        document.getElementById("add-faq-form").scrollIntoView({ behavior: "smooth" });
    }

    document.getElementById("add-faq-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = {
            id: document.getElementById("faq-id-in").value || null,
            question: document.getElementById("faq-question-in").value,
            category: document.getElementById("faq-category-in").value,
            answer: document.getElementById("faq-answer-in").value
        };

        fetch("/api/admin/faqs/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("FAQ saved successfully!");
                document.getElementById("add-faq-form").reset();
                document.getElementById("faq-id-in").value = "";
                loadAdminData();
            } else {
                showToast(data.error || "Failed to save FAQ", true);
            }
        });
    });

    function deleteFAQ(id) {
        if (!confirm("Are you sure you want to delete this FAQ?")) return;
        
        fetch("/api/admin/faqs/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("FAQ deleted.");
                loadAdminData();
            } else {
                showToast("Failed to delete FAQ", true);
            }
        });
    }

    // Initial load
    loadAdminData();
});
