document.addEventListener("DOMContentLoaded", () => {
    // Current user state cached locally
    let studentProfile = null;

    // --- Tab Switching Logic ---
    const menuButtons = document.querySelectorAll(".menu-item-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");
    const sidebar = document.getElementById("sidebar");

    const tabSubtitles = {
        home: "Welcome back to your academic overview",
        chat: "Ask college details, syllabus, dates, or get educational tutoring",
        academics: "Browse subjects syllabus and check upcoming exam slots",
        tasks: "Manage your assignments submissions and track checklists",
        accounts: "View your financial statements and download paid receipts",
        grades: "View your marksheet and calculate projected SGPA",
        faq: "Find answers to frequently asked questions about the campus"
    };

    menuButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");
            
            // Remove active classes
            menuButtons.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            
            // Add active classes
            btn.classList.add("active");
            document.getElementById(`tab-${tabName}`).classList.add("active");
            
            // Set Header details
            pageTitle.textContent = btn.querySelector("span").textContent;
            pageSubtitle.textContent = tabSubtitles[tabName] || "";

            // Close sidebar on mobile
            if (sidebar.classList.contains("open")) {
                sidebar.classList.remove("open");
            }

            // Run tab-specific initializations
            if (tabName === "home") {
                loadProfile();
                loadNotices();
            } else if (tabName === "academics") {
                loadAcademics();
            } else if (tabName === "tasks") {
                loadTasks();
            } else if (tabName === "accounts") {
                loadAccounts();
            } else if (tabName === "grades") {
                loadGrades();
            } else if (tabName === "faq") {
                loadFAQs();
            } else if (tabName === "chat") {
                loadChatHistory();
            }
        });
    });

    // Mobile Menu Toggle
    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // Close mobile sidebar by clicking outside
    document.addEventListener("click", (e) => {
        if (sidebar && sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
            sidebar.classList.remove("open");
        }
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

    // --- Tab 1: Load Profile & Statistics ---
    function loadProfile() {
        fetch("/api/student/profile")
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    showToast(data.error, true);
                    return;
                }
                studentProfile = data;
                
                // Update header details
                const firstLetter = data.full_name.charAt(0).toUpperCase();
                document.getElementById("user-avatar").textContent = firstLetter;
                document.getElementById("user-display-name").textContent = data.full_name;

                // Update Profile card fields
                document.getElementById("profile-name").textContent = data.full_name;
                document.getElementById("profile-roll").textContent = data.roll_number || "Not assigned";
                document.getElementById("profile-course").textContent = data.course || "--";
                document.getElementById("profile-semester").textContent = data.semester || "--";

                // Update Overview values
                document.getElementById("attendance-stat").textContent = `${data.attendance_pct}%`;
                document.getElementById("fees-stat").textContent = `$${data.fees_due.toLocaleString()}`;

                // Set Circular Progress Ring
                setAttendanceRing(data.attendance_pct);
                checkAttendanceAlert(data.attendance_pct);
            })
            .catch(err => console.error("Error loading profile:", err));
    }

    function setAttendanceRing(pct) {
        const circle = document.getElementById("attendance-circle");
        const text = document.getElementById("attendance-percent-text");
        text.textContent = `${pct}%`;
        
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI; // ~213.62
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (pct / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Change color based on threshold (red warning if attendance < 75)
        if (pct < 75) {
            circle.style.stroke = "var(--danger)";
            text.style.color = "var(--danger)";
        } else {
            circle.style.stroke = "var(--success)";
            text.style.color = "var(--text-primary)";
        }
    }

    function checkAttendanceAlert(pct) {
        const alertBox = document.getElementById("attendance-alert-box");
        const alertTitle = document.getElementById("attendance-alert-title");
        const alertMsg = document.getElementById("attendance-alert-message");
        const iconWrapper = document.getElementById("attendance-alert-icon-wrapper");
        
        if (!alertBox) return;
        
        alertBox.style.display = "block";
        
        if (pct >= 75) {
            alertBox.className = "attendance-alert-banner success glass-panel";
            alertTitle.textContent = "Attendance Status: Clear";
            alertMsg.innerHTML = `Your attendance is currently <strong>${pct}%</strong>. You are in the safe zone (minimum 75% required). Excellent work, keep attending classes regularly!`;
            iconWrapper.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else {
            alertBox.className = "attendance-alert-banner danger glass-panel";
            alertTitle.textContent = "Attendance Warning: Debar Risk";
            
            // Assume 80 classes conducted in semester so far
            const conducted = 80;
            const attended = Math.round((pct / 100) * conducted);
            const required = Math.max(1, Math.ceil(3 * conducted - 4 * attended));
            
            alertMsg.innerHTML = `Your attendance is currently <strong>${pct}%</strong>, which is below the mandatory 75% limit. You need to attend the next <strong>${required}</strong> classes consecutively to reach 75% and clear debarment risk!`;
            iconWrapper.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        }
    }

    // Load Notices
    function loadNotices() {
        const container = document.getElementById("notice-list-container");
        fetch("/api/student/notices")
            .then(res => res.json())
            .then(notices => {
                if (notices.length === 0) {
                    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No current notices.</div>`;
                    return;
                }
                
                container.innerHTML = "";
                notices.forEach(notice => {
                    const card = document.createElement("div");
                    card.className = "notice-card";
                    
                    // Format date
                    const dateObj = new Date(notice.date_posted);
                    const formattedDate = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
                    
                    // Check if notice was posted in the last 24 hours
                    const now = new Date();
                    const diffHrs = (now - dateObj) / (1000 * 60 * 60);
                    const isNew = diffHrs <= 24;
                    
                    if (isNew) {
                        card.classList.add("new-notice");
                    }

                    card.innerHTML = `
                        <div class="notice-meta">
                            <span class="notice-tag ${notice.category}">${notice.category}</span>
                            <span class="notice-date">${formattedDate} ${isNew ? '<span class="new-notice-badge">NEW</span>' : ''}</span>
                        </div>
                        <div class="notice-title">${notice.title}</div>
                        <div class="notice-content">${notice.content}</div>
                    `;
                    container.appendChild(card);
                });
            })
            .catch(err => {
                console.error("Error notices:", err);
                container.innerHTML = `<div style="color: var(--danger); padding: 20px; text-align: center;">Failed to load notices.</div>`;
            });
    }

    // --- Tab 3: Academics (Syllabus & Exams) ---
    function loadAcademics() {
        // Load Syllabus
        const syllabusContainer = document.getElementById("syllabus-list-container");
        syllabusContainer.innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading syllabus...</div>`;
        
        fetch("/api/student/syllabus")
            .then(res => res.json())
            .then(syllabusList => {
                if (syllabusList.length === 0) {
                    syllabusContainer.innerHTML = `<div class="glass-panel" style="padding: 20px; text-align: center; color: var(--text-secondary);">No syllabus assigned to your course/semester.</div>`;
                    return;
                }
                syllabusContainer.innerHTML = "";
                syllabusList.forEach(item => {
                    const card = document.createElement("div");
                    card.className = "subject-card glass-panel";
                    card.innerHTML = `
                        <div class="subject-header">
                            <span class="subject-title">${item.subject}</span>
                            <i class="fa-solid fa-chevron-down subject-chevron"></i>
                        </div>
                        <div class="subject-details">
                            <h4>Detailed Topics</h4>
                            <p>${item.topics.replace(/\n/g, '<br>')}</p>
                            ${item.resources ? `<h4>Recommended Learning Resources</h4><p>${item.resources}</p>` : ''}
                        </div>
                    `;
                    
                    // Attach toggle click event
                    card.querySelector(".subject-header").addEventListener("click", () => {
                        card.classList.toggle("expanded");
                    });
                    
                    syllabusContainer.appendChild(card);
                });
            });

        // Load Exams
        const examTimeline = document.getElementById("exam-timeline-container");
        examTimeline.innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading exam dates...</div>`;
        
        fetch("/api/student/exams")
            .then(res => res.json())
            .then(exams => {
                if (exams.length === 0) {
                    examTimeline.innerHTML = `<div style="text-align: center; color: var(--text-secondary);">No examinations scheduled.</div>`;
                    document.getElementById("next-exam-stat").textContent = "No schedule";
                    return;
                }
                
                examTimeline.innerHTML = "";
                
                // Find next upcoming exam (closest date >= today)
                const today = new Date();
                today.setHours(0,0,0,0);
                let closestExam = null;
                let minDiff = Infinity;

                exams.forEach(exam => {
                    const examDate = new Date(exam.exam_date);
                    const timeDiff = examDate - today;
                    if (timeDiff >= 0 && timeDiff < minDiff) {
                        minDiff = timeDiff;
                        closestExam = exam;
                    }

                    const item = document.createElement("div");
                    item.className = "timeline-item";
                    
                    const dateObj = new Date(exam.exam_date);
                    const formattedDate = dateObj.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});

                    item.innerHTML = `
                        <div class="timeline-marker"></div>
                        <div class="timeline-content glass-panel">
                            <div class="timeline-date">${formattedDate}</div>
                            <div class="timeline-title">${exam.subject}</div>
                            <div class="timeline-info">
                                <span><i class="fa-regular fa-clock" style="margin-right: 5px;"></i> ${exam.time}</span>
                                <span style="margin-left: 15px;"><i class="fa-solid fa-location-dot" style="margin-right: 5px;"></i> ${exam.room}</span>
                            </div>
                        </div>
                    `;
                    examTimeline.appendChild(item);
                });

                if (closestExam) {
                    const nextDate = new Date(closestExam.exam_date);
                    document.getElementById("next-exam-stat").textContent = `${closestExam.subject} (${nextDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})`;
                } else {
                    document.getElementById("next-exam-stat").textContent = "Exams Completed";
                }
            });
    }

    // --- Tab 4: Tasks (Assignments Checklist) ---
    function loadTasks() {
        const container = document.getElementById("assignment-list-container");
        container.innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading tasks...</div>`;
        
        fetch("/api/student/assignments")
            .then(res => res.json())
            .then(assignments => {
                if (assignments.length === 0) {
                    container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No assignments found for you.</div>`;
                    return;
                }
                
                container.innerHTML = "";
                assignments.forEach(assign => {
                    const item = document.createElement("div");
                    const isCompleted = assign.status === "Submitted";
                    item.className = `assignment-item glass-panel ${isCompleted ? 'completed' : ''}`;
                    
                    const dateObj = new Date(assign.due_date);
                    const formattedDate = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

                    item.innerHTML = `
                        <div class="assignment-checkbox-wrapper">
                            <div class="custom-checkbox" data-id="${assign.id}" data-status="${assign.status}">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <div class="assignment-text">
                                <span class="assignment-title">${assign.title}</span>
                                <span class="assignment-desc">${assign.description || ''}</span>
                            </div>
                        </div>
                        <div class="assignment-meta">
                            <span class="assignment-due">Due: ${formattedDate}</span>
                            <span class="assignment-status-badge ${assign.status}">${assign.status}</span>
                        </div>
                    `;
                    
                    // Toggle checkbox event
                    item.querySelector(".custom-checkbox").addEventListener("click", function() {
                        const id = this.getAttribute("data-id");
                        const currentStatus = this.getAttribute("data-status");
                        const nextStatus = currentStatus === "Submitted" ? "Pending" : "Submitted";
                        
                        fetch("/api/student/assignments/toggle", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: id, status: nextStatus })
                        })
                        .then(res => res.json())
                        .then(resData => {
                            if (resData.success) {
                                showToast(nextStatus === "Submitted" ? "Assignment marked as Submitted!" : "Assignment marked as Pending.");
                                loadTasks(); // Reload checklist
                            } else {
                                showToast("Failed to update status", true);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                            showToast("Server communication error", true);
                        });
                    });
                    
                    container.appendChild(item);
                });
            });
    }

    // --- Tab 5: Tuition Accounts ---
    function loadAccounts() {
        if (!studentProfile) {
            fetch("/api/student/profile")
                .then(res => res.json())
                .then(data => {
                    studentProfile = data;
                    renderAccountsData();
                });
        } else {
            renderAccountsData();
        }
    }

    function renderAccountsData() {
        const data = studentProfile;
        const total = data.fees_paid + data.fees_due;
        
        document.getElementById("fee-pending-val").textContent = `$${data.fees_due.toLocaleString()}`;
        document.getElementById("fee-total-val").textContent = `$${total.toLocaleString()}`;
        document.getElementById("fee-paid-val").textContent = `$${data.fees_paid.toLocaleString()}`;
        
        const statusVal = document.getElementById("fee-status-val");
        if (data.fees_due === 0) {
            statusVal.textContent = "FULLY CLEAR";
            statusVal.style.color = "var(--success)";
            document.getElementById("fee-pending-val").className = "fee-total-value paid";
        } else {
            statusVal.textContent = "OUTSTANDING DUES";
            statusVal.style.color = "var(--warning)";
            document.getElementById("fee-pending-val").className = "fee-total-value";
        }

        // Render dummy receipts based on payment history
        const receiptsContainer = document.getElementById("receipt-list-container");
        receiptsContainer.innerHTML = "";
        
        if (data.fees_paid > 0) {
            // Generate two mock transactions making up the fees_paid amount
            const t1 = Math.round(data.fees_paid * 0.6);
            const t2 = data.fees_paid - t1;
            
            const receipts = [
                { id: "TXN48201", desc: "Admission & Semester Tuition Fee Part-2", date: "2026-03-10", amt: t1 },
                { id: "TXN10384", desc: "Admission & Semester Tuition Fee Part-1", date: "2026-01-05", amt: t2 }
            ];

            receipts.forEach(r => {
                const card = document.createElement("div");
                card.className = "receipt-card glass-panel";
                
                const dateObj = new Date(r.date);
                const formattedDate = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

                card.innerHTML = `
                    <div class="receipt-left">
                        <h4>${r.desc}</h4>
                        <p>ID: ${r.id} | Paid on ${formattedDate}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="receipt-right">+$${r.amt.toLocaleString()}</span>
                        <button class="action-btn print-receipt-btn" data-id="${r.id}" data-desc="${r.desc}" data-date="${formattedDate}" data-amt="${r.amt}" title="Print Receipt" style="font-size: 0.95rem; padding: 6px; color: var(--primary); background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-print"></i>
                        </button>
                    </div>
                `;
                
                // Add click listener
                card.querySelector(".print-receipt-btn").addEventListener("click", function() {
                    const id = this.getAttribute("data-id");
                    const desc = this.getAttribute("data-desc");
                    const date = this.getAttribute("data-date");
                    const amt = this.getAttribute("data-amt");
                    printReceiptPDF(id, desc, date, amt);
                });

                receiptsContainer.appendChild(card);
            });
        } else {
            receiptsContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No transaction history.</div>`;
        }
    }

    function printReceiptPDF(id, desc, date, amt) {
        const student = studentProfile || { full_name: "Rohan Sharma", roll_number: "CS2023001", course: "Computer Science", semester: "Semester 5" };
        const printWindow = window.open("", "_blank", "width=800,height=600");
        printWindow.document.write(`
            <html>
            <head>
                <title>Fee Receipt - ${id}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; line-height: 1.5; }
                    .receipt-box { border: 2px solid #ddd; padding: 30px; border-radius: 8px; max-width: 700px; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 25px; }
                    .header h2 { margin: 0; color: #4f46e5; font-size: 1.8rem; }
                    .header p { margin: 5px 0 0 0; color: #666; font-size: 0.9rem; }
                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
                    .details-item span { font-size: 0.85rem; color: #666; display: block; margin-bottom: 2px; text-transform: uppercase; }
                    .details-item strong { font-size: 1.05rem; color: #111; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .table th { background: #f3f4f6; color: #374151; text-align: left; padding: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
                    .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
                    .summary { display: flex; justify-content: flex-end; margin-bottom: 40px; }
                    .summary-box { text-align: right; border-top: 2px solid #374151; padding-top: 10px; width: 250px; }
                    .summary-box div { font-size: 1.1rem; font-weight: 700; color: #111; margin-top: 5px; }
                    .status-paid { display: inline-block; background: #def7ec; color: #03543f; padding: 6px 16px; border-radius: 20px; font-weight: 700; text-transform: uppercase; font-size: 0.85rem; margin-top: 10px; }
                    .footer { text-align: center; color: #9ca3af; font-size: 0.8rem; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; }
                    @media print {
                        body { padding: 0; }
                        .receipt-box { border: none; box-shadow: none; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-box">
                    <div class="header">
                        <div>
                            <h2>PRINCE COLLEGE OF ENGINEERING</h2>
                            <p>Campus Admin Portal & Student Services</p>
                        </div>
                        <div style="text-align: right;">
                            <span class="status-paid">PAID</span>
                        </div>
                    </div>
                    
                    <div class="details-grid">
                        <div class="details-item">
                            <span>Student Name</span>
                            <strong>${student.full_name}</strong>
                        </div>
                        <div class="details-item">
                            <span>Receipt / Transaction ID</span>
                            <strong>${id}</strong>
                        </div>
                        <div class="details-item">
                            <span>Roll Number</span>
                            <strong>${student.roll_number || 'N/A'}</strong>
                        </div>
                        <div class="details-item">
                            <span>Date of Transaction</span>
                            <strong>${date}</strong>
                        </div>
                        <div class="details-item">
                            <span>Course & Semester</span>
                            <strong>${student.course} - ${student.semester}</strong>
                        </div>
                        <div class="details-item">
                            <span>Payment Channel</span>
                            <strong>Online Portal (NetBanking/UPI)</strong>
                        </div>
                    </div>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th style="text-align: right;">Amount Charged</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${desc}</td>
                                <td style="text-align: right;">$${Number(amt).toLocaleString()}.00</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="summary">
                        <div class="summary-box">
                            <span style="font-size: 0.85rem; color: #666;">TOTAL PAID AMOUNT</span>
                            <div>$${Number(amt).toLocaleString()}.00</div>
                        </div>
                    </div>

                    <div class="footer">
                        <p>This is a computer-generated transaction receipt. No signature is required.</p>
                        <p>&copy; 2026 Prince College Admin Portal. All rights reserved.</p>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // --- Tab 6: Help & FAQs accordion ---
    let faqsCache = [];
    
    function loadFAQs() {
        const container = document.getElementById("faq-list-container");
        container.innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading FAQs...</div>`;
        
        fetch("/api/student/faqs")
            .then(res => res.json())
            .then(faqs => {
                faqsCache = faqs;
                renderFAQs(faqs);
            });
    }

    function renderFAQs(faqs) {
        const container = document.getElementById("faq-list-container");
        if (faqs.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No matching questions found.</div>`;
            return;
        }
        
        container.innerHTML = "";
        faqs.forEach(faq => {
            const card = document.createElement("div");
            card.className = "faq-item-card glass-panel";
            card.innerHTML = `
                <div class="faq-question-row">
                    <span class="faq-question">${faq.question}</span>
                    <i class="fa-solid fa-chevron-down faq-chevron"></i>
                </div>
                <div class="faq-answer-row">
                    <p class="faq-answer">${faq.answer}</p>
                </div>
            `;
            
            card.addEventListener("click", () => {
                card.classList.toggle("expanded");
            });
            
            container.appendChild(card);
        });
    }

    // FAQ Search bar
    const faqSearchInput = document.getElementById("faq-search");
    if (faqSearchInput) {
        faqSearchInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (!q) {
                renderFAQs(faqsCache);
                return;
            }
            const filtered = faqsCache.filter(faq => 
                faq.question.toLowerCase().includes(q) || 
                faq.answer.toLowerCase().includes(q)
            );
            renderFAQs(filtered);
        });
    }

    // --- TAB 2: AI Chatbot Workspace ---
    const chatInput = document.getElementById("chat-input");
    const chatSendBtn = document.getElementById("chat-send-btn");
    const chatMessagesContainer = document.getElementById("chat-messages-container");

    // Send query trigger
    function sendChatQuery(messageText, isVoice = false) {
        if (!messageText) return;
        
        // Append user bubble
        appendChatBubble(messageText, "user");
        chatInput.value = "";
        
        // Show Typing Indicator
        showTypingIndicator();
        
        // Scroll bottom
        scrollToBottom();

        // AJAX POST to Flask API
        fetch("/api/student/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageText })
        })
        .then(res => res.json())
        .then(data => {
            removeTypingIndicator();
            if (data.error) {
                appendChatBubble("Sorry, I encountered an issue processing that. Please try again.", "bot");
            } else {
                appendChatBubble(data.response, "bot");
                if (isVoice) {
                    speakText(data.response);
                }
            }
            scrollToBottom();
        })
        .catch(err => {
            removeTypingIndicator();
            console.error(err);
            appendChatBubble("I am unable to connect to the campus server. Please verify your connection.", "bot");
            scrollToBottom();
        });
    }

    // Text-to-Speech SpeechSynthesis Helper
    function speakText(text) {
        if ('speechSynthesis' in window) {
            // Cancel active utterances first
            window.speechSynthesis.cancel();
            
            // Clean markdown/HTML tags from output text for narration
            const cleanText = text
                .replace(/<[^>]*>/g, "") // Remove HTML tags
                .replace(/[*#_`~•-]/g, "") // Remove markdown characters
                .replace(/&[^;]+;/g, ""); // Remove HTML entities
                
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Microsoft')));
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            window.speechSynthesis.speak(utterance);
        }
    }

    function appendChatBubble(text, sender) {
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${sender}`;
        
        // Handle basic markdown lists / linebreaks in response
        let formattedText = text
            .replace(/\n/g, "<br>")
            .replace(/• (.*?)(<br>|$)/g, "<li>$1</li>")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/_(.*?)_/g, "<em>$1</em>");
        
        if (formattedText.includes("<li>")) {
            // Group lists together
            formattedText = formattedText.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");
        }

        bubble.innerHTML = formattedText;

        // Append speaker icon button
        const speakBtn = document.createElement("button");
        speakBtn.className = "msg-speak-btn";
        speakBtn.title = "Read aloud";
        speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        speakBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            speakText(text);
        });
        bubble.appendChild(speakBtn);

        chatMessagesContainer.appendChild(bubble);
    }

    function showTypingIndicator() {
        const indicator = document.createElement("div");
        indicator.className = "typing-indicator";
        indicator.id = "chat-typing-indicator";
        indicator.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        chatMessagesContainer.appendChild(indicator);
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById("chat-typing-indicator");
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function loadChatHistory() {
        chatMessagesContainer.innerHTML = "";
        showTypingIndicator();
        
        fetch("/api/student/chat/history")
            .then(res => res.json())
            .then(history => {
                removeTypingIndicator();
                if (history.length === 0) {
                    appendWelcomeGreeting();
                    return;
                }
                history.forEach(item => {
                    appendChatBubble(item.message, "user");
                    appendChatBubble(item.response, "bot");
                });
                scrollToBottom();
            })
            .catch(() => {
                removeTypingIndicator();
                appendWelcomeGreeting();
            });
    }

    function appendWelcomeGreeting() {
        const studentName = studentProfile ? studentProfile.full_name : "Rohan Sharma";
        const bubble = document.createElement("div");
        bubble.className = "message-bubble bot";
        
        bubble.innerHTML = `
            <div class="welcome-chat-card" style="padding: 10px 0;">
                <p style="font-size: 1.05rem; font-weight: 600; color: var(--primary); margin-bottom: 8px;">Welcome to the Prince AI Student Chatbot</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">I can help you navigate college life, view grades, check attendance, calculate dues, search subject syllabus details, or answer academic questions using AI.</p>
                <div class="chat-starter-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div class="chat-starter-card" data-query="Calculate my current CGPA" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: var(--primary); margin-bottom: 4px;"><i class="fa-solid fa-graduation-cap"></i> GPA Report</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Retrieve my grades list and calculate CGPA.</div>
                    </div>
                    <div class="chat-starter-card" data-query="Am I at risk of attendance debarment?" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: var(--warning); margin-bottom: 4px;"><i class="fa-solid fa-circle-exclamation"></i> Debar check</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Check if my attendance is above the 75% rule.</div>
                    </div>
                    <div class="chat-starter-card" data-query="Explain normalization 1NF, 2NF and 3NF in DBMS" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: var(--secondary); margin-bottom: 4px;"><i class="fa-solid fa-book-open"></i> Study Tutor</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Explain normal forms in databases.</div>
                    </div>
                    <div class="chat-starter-card" data-query="What is the exam schedule?" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: var(--success); margin-bottom: 4px;"><i class="fa-solid fa-calendar-days"></i> Exam Schedule</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">View upcoming Semester 5 exams and locations.</div>
                    </div>
                </div>
            </div>
        `;

        // Append speaker icon button
        const speakBtn = document.createElement("button");
        speakBtn.className = "msg-speak-btn";
        speakBtn.title = "Read aloud";
        speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        speakBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            speakText("Welcome to the Prince AI Student Chatbot");
        });
        bubble.appendChild(speakBtn);

        chatMessagesContainer.appendChild(bubble);

        // Add event listeners to starter cards
        bubble.querySelectorAll(".chat-starter-card").forEach(card => {
            card.addEventListener("click", () => {
                const query = card.getAttribute("data-query");
                sendChatQuery(query);
            });
            // Hover styling
            card.addEventListener("mouseover", () => {
                card.style.background = "rgba(255,255,255,0.05)";
                card.style.borderColor = "var(--primary)";
            });
            card.addEventListener("mouseout", () => {
                card.style.background = "rgba(255,255,255,0.02)";
                card.style.borderColor = "var(--border-color)";
            });
        });
    }

    // --- Tab 6: Grades & GPA Report & Simulator ---
    function loadGrades() {
        const tableBody = document.getElementById("student-grades-table-body");
        const cgpaBadge = document.getElementById("cgpa-badge");
        const calcRows = document.getElementById("gpa-calc-rows");
        
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading grade report...</td></tr>`;
        
        fetch("/api/student/grades")
            .then(res => res.json())
            .then(grades => {
                if (grades.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No grades records found.</td></tr>`;
                    cgpaBadge.textContent = "SGPA: N/A";
                    return;
                }
                
                tableBody.innerHTML = "";
                let totalPoints = 0;
                let totalCredits = 0;
                const gpMap = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "F": 0 };
                
                // For simulator
                calcRows.innerHTML = "";

                grades.forEach(g => {
                    const row = document.createElement("tr");
                    const gp = gpMap[g.grade] || 8;
                    totalPoints += gp * g.credits;
                    totalCredits += g.credits;
                    
                    const statusClass = g.grade === 'F' ? 'danger-badge' : 'success-badge';
                    const statusText = g.grade === 'F' ? 'FAILED' : 'PASSED';
                    
                    row.innerHTML = `
                        <td style="font-weight: 500;">${g.subject}</td>
                        <td style="text-align: center;">${g.credits}</td>
                        <td style="text-align: center;">${g.marks}</td>
                        <td style="text-align: center; font-weight: 700; color: var(--primary);">${g.grade}</td>
                        <td style="text-align: center;"><span class="${statusClass}" style="font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: 600;">${statusText}</span></td>
                    `;
                    tableBody.appendChild(row);
                    
                    // Simulator Row
                    const simRow = document.createElement("div");
                    simRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 12px 15px; border-radius: 6px; border: 1px solid var(--border-color);";
                    simRow.innerHTML = `
                        <span style="font-weight: 500; font-size: 0.9rem;">${g.subject} <span style="color: var(--text-muted); font-size: 0.8rem;">(${g.credits} Credits)</span></span>
                        <select class="gpa-sim-select" data-credits="${g.credits}" style="background: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 4px; outline: none; font-family: var(--font-display); font-weight: 600;">
                            <option value="10" ${g.grade === 'O' ? 'selected' : ''}>O (Outstanding)</option>
                            <option value="9" ${g.grade === 'A+' ? 'selected' : ''}>A+ (Excellent)</option>
                            <option value="8" ${g.grade === 'A' ? 'selected' : ''}>A (Very Good)</option>
                            <option value="7" ${g.grade === 'B+' ? 'selected' : ''}>B+ (Good)</option>
                            <option value="6" ${g.grade === 'B' ? 'selected' : ''}>B (Above Average)</option>
                            <option value="5" ${g.grade === 'C' ? 'selected' : ''}>C (Pass)</option>
                            <option value="0" ${g.grade === 'F' ? 'selected' : ''}>F (Fail)</option>
                        </select>
                    `;
                    calcRows.appendChild(simRow);
                });
                
                const finalSGPA = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
                cgpaBadge.textContent = `SGPA: ${finalSGPA}`;
                document.getElementById("projected-gpa-val").textContent = finalSGPA;
            })
            .catch(err => {
                console.error("Error loading grades:", err);
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 20px;">Failed to fetch grade records.</td></tr>`;
            });
    }

    // Recalculate Simulator SGPA
    const recalcBtn = document.getElementById("gpa-recalc-btn");
    if (recalcBtn) {
        recalcBtn.addEventListener("click", () => {
            const selects = document.querySelectorAll(".gpa-sim-select");
            let totalPoints = 0;
            let totalCredits = 0;
            
            selects.forEach(select => {
                const gp = parseInt(select.value);
                const credits = parseInt(select.getAttribute("data-credits"));
                totalPoints += gp * credits;
                totalCredits += credits;
            });
            
            const projected = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
            document.getElementById("projected-gpa-val").textContent = projected;
            showToast(`Calculated Projected SGPA: ${projected}`);
        });
    }

    // Export Chat History Button Listener
    const exportChatBtn = document.getElementById("export-chat-btn");
    if (exportChatBtn) {
        exportChatBtn.addEventListener("click", () => {
            const messages = document.querySelectorAll("#chat-messages-container .message-bubble");
            if (messages.length <= 1) {
                showToast("Chat history is empty or contains only welcome message.", true);
                return;
            }
            
            const studentName = studentProfile ? studentProfile.full_name : "Rohan Sharma";
            const rollNum = studentProfile ? studentProfile.roll_number : "CS2023001";
            const timeStr = new Date().toLocaleString();
            
            let chatText = `==================================================\n`;
            chatText += `           PRINCE AI CHATBOT EXPORT\n`;
            chatText += `==================================================\n`;
            chatText += `Student Name : ${studentName}\n`;
            chatText += `Roll Number  : ${rollNum}\n`;
            chatText += `Export Date  : ${timeStr}\n`;
            chatText += `==================================================\n\n`;
            
            messages.forEach(bubble => {
                const isUser = bubble.classList.contains("user");
                const senderName = isUser ? "User" : "Prince AI Chatbot";
                
                // Clean speech icon tags/text from the message text content
                let contentText = bubble.innerText || bubble.textContent;
                contentText = contentText.replace("Read aloud", "").trim();
                
                chatText += `[${senderName}]: ${contentText}\n\n`;
            });
            
            chatText += `==================================================\n`;
            chatText += `             End of Conversation Transcript\n`;
            chatText += `==================================================\n`;
            
            // Trigger browser download
            const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `chat_export_${rollNum.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Conversation exported successfully!");
        });
    }

    // Clear Chat History Button Listener
    const clearChatBtn = document.getElementById("clear-chat-btn");
    if (clearChatBtn) {
        clearChatBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your chat history? This cannot be undone.")) {
                fetch("/api/student/chat/clear", { method: "POST" })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            showToast("Chat history cleared!");
                            loadChatHistory(); // Reset view and append welcome greeting
                        } else {
                            showToast("Failed to clear chat history.", true);
                        }
                    })
                    .catch(() => showToast("Communication error.", true));
            }
        });
    }

    // Speech Recognition Setup
    const chatMicBtn = document.getElementById("chat-mic-btn");
    let isRecording = false;

    if (chatMicBtn) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                isRecording = true;
                chatMicBtn.classList.add("recording");
                chatMicBtn.querySelector("i").className = "fa-solid fa-microphone-slash";
                chatInput.placeholder = "Listening... Speak now...";
                showToast("Microphone is active. Speak now.");
            };

            recognition.onend = () => {
                isRecording = false;
                chatMicBtn.classList.remove("recording");
                chatMicBtn.querySelector("i").className = "fa-solid fa-microphone";
                chatInput.placeholder = "Type or speak college query (e.g. When is the DBMS exam?)...";
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                chatInput.value = transcript;
                sendChatQuery(transcript, true);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                showToast("Speech recognition failed: " + event.error, true);
            };

            chatMicBtn.addEventListener("click", () => {
                if (isRecording) {
                    recognition.stop();
                } else {
                    recognition.start();
                }
            });
        } else {
            chatMicBtn.addEventListener("click", () => {
                showToast("Speech recognition is not supported in this browser. Please use Chrome or Edge.", true);
            });
        }
    }

    // Submit events
    if (chatSendBtn) {
        chatSendBtn.addEventListener("click", () => {
            sendChatQuery(chatInput.value.trim());
        });
    }

    if (chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendChatQuery(chatInput.value.trim());
            }
        });
    }

    // Quick Chips click handlers
    const chips = document.querySelectorAll(".chat-chip");
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const query = chip.getAttribute("data-query");
            sendChatQuery(query);
        });
    });

    // Run home tab initializations immediately on load
    loadProfile();
    loadNotices();
});
