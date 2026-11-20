const navbar = document.getElementById("navbar");
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
const navLinks = document.querySelectorAll(".nav-link");


// ================================
// MOBILE MENU
// ================================

menuToggle.addEventListener("click", () => {

    menuToggle.classList.toggle("active");

    navMenu.classList.toggle("open");

});


// Close menu after clicking a link

navLinks.forEach(link => {

    link.addEventListener("click", () => {

        menuToggle.classList.remove("active");

        navMenu.classList.remove("open");

    });

});


// ================================
// NAVBAR SCROLL EFFECT
// ================================

window.addEventListener("scroll", () => {

    if (window.scrollY > 40) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }

});


// ================================
// ACTIVE NAV LINK
// ================================

const sections = document.querySelectorAll("section[id]");

window.addEventListener("scroll", () => {

    let current = "";

    sections.forEach(section => {

        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.offsetHeight;

        if (
            window.scrollY >= sectionTop &&
            window.scrollY < sectionTop + sectionHeight
        ) {
            current = section.getAttribute("id");
        }

    });


    navLinks.forEach(link => {

        link.classList.remove("active");

        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }

    });

}); 



/* =========================================================
   PROJECTS FILTER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const filterButtons =
        document.querySelectorAll(".filter-btn");

    const projectCards =
        document.querySelectorAll(".project-card");


    filterButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const filterValue =
                button.dataset.filter;


            /* ==============================
               ACTIVE BUTTON
            ============================== */

            filterButtons.forEach((btn) => {
                btn.classList.remove("active");
            });

            button.classList.add("active");


            /* ==============================
               FILTER PROJECTS
            ============================== */

            projectCards.forEach((card) => {

                const category =
                    card.dataset.category;


                if (
                    filterValue === "all" ||
                    category === filterValue
                ) {

                    card.classList.remove("hide");

                    card.classList.remove("show");

                    void card.offsetWidth;

                    card.classList.add("show");

                } else {

                    card.classList.remove("show");

                    card.classList.add("hide");

                }

            });

        });

    });

});




/* =========================================
   TESTIMONIALS SLIDER
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const slider = document.getElementById("testimonialSlider");

    if (!slider) return;

    const cards = slider.querySelectorAll(".testimonial-card");
    const dots = slider.querySelectorAll(".testimonial-dot");

    const prevBtn = document.getElementById("testimonialPrev");
    const nextBtn = document.getElementById("testimonialNext");

    let currentIndex = 0;
    let autoPlay;

    const delay = 4500;


    // Show Selected Card
    function showTestimonial(index) {

        currentIndex = (index + cards.length) % cards.length;

        cards.forEach((card, i) => {

            card.classList.toggle("active", i === currentIndex);

            card.setAttribute(
                "aria-hidden",
                i !== currentIndex
            );

        });


        // Update Dots
        dots.forEach((dot, i) => {

            dot.classList.toggle("active", i === currentIndex);

            dot.setAttribute(
                "aria-current",
                i === currentIndex ? "true" : "false"
            );

        });

    }


    // Next Card
    function nextTestimonial() {
        showTestimonial(currentIndex + 1);
    }


    // Previous Card
    function prevTestimonial() {
        showTestimonial(currentIndex - 1);
    }


    // Start Autoplay
    function startAutoPlay() {

        stopAutoPlay();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        autoPlay = setInterval(() => {

            if (!document.hidden) {
                nextTestimonial();
            }

        }, delay);

    }


    // Stop Autoplay
    function stopAutoPlay() {

        clearInterval(autoPlay);

    }


    // Reset Timer After Manual Navigation
    function resetAutoPlay() {

        stopAutoPlay();
        startAutoPlay();

    }


    // Navigation Buttons
    nextBtn.addEventListener("click", () => {

        nextTestimonial();
        resetAutoPlay();

    });


    prevBtn.addEventListener("click", () => {

        prevTestimonial();
        resetAutoPlay();

    });


    // Dots Navigation
    dots.forEach((dot, index) => {

        dot.addEventListener("click", () => {

            showTestimonial(index);
            resetAutoPlay();

        });

    });


    // Pause On Hover
    slider.addEventListener("mouseenter", stopAutoPlay);

    slider.addEventListener("mouseleave", startAutoPlay);


    // Pause While Keyboard Focus Is Inside
    slider.addEventListener("focusin", stopAutoPlay);

    slider.addEventListener("focusout", (event) => {

        if (!slider.contains(event.relatedTarget)) {
            startAutoPlay();
        }

    });


    // Pause When Tab Is Hidden
    document.addEventListener("visibilitychange", () => {

        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }

    });


    // Keyboard Navigation
    slider.addEventListener("keydown", (event) => {

        if (event.key === "ArrowRight") {
            nextTestimonial();
            resetAutoPlay();
        }

        if (event.key === "ArrowLeft") {
            prevTestimonial();
            resetAutoPlay();
        }

    });


    // Initial Setup
    showTestimonial(0);
    startAutoPlay();

});




/* =========================================
   FETCH, RENDER, AND FILTER PROJECTS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const projectsGrid = document.querySelector(".projects-grid");

    if (!projectsGrid) return;

    // 1. جلب المشاريع من السيرفر
    async function fetchAndRenderProjects() {
        try {
            const apiRoot = window.location.port === "5500" ? "http://localhost:5000/api" : "/api";
            const response = await fetch(`${apiRoot}/projects`);
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                renderProjects(result.data);
                initFiltering(); // تفعيل الفلتر فوراً بعد تحميل ورسم الكروت
            } else {
                projectsGrid.innerHTML = `<p style="text-align: center; color: #8f9bb3; grid-column: 1 / -1;">لا توجد مشاريع مضافة حالياً.</p>`;
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error);
            projectsGrid.innerHTML = `<p style="text-align: center; color: #ef4444; grid-column: 1 / -1;">فشل الاتصال بالخادم لجلب المشاريع.</p>`;
        }
    }

  // 2. رسم الكروت ديناميكياً
    function renderProjects(projects) {
        projectsGrid.innerHTML = "";

        projects.forEach((project) => {
            const card = document.createElement("article");
            card.className = "project-card";
            card.dataset.category = project.category;

            const techs = Array.isArray(project.technologies) && project.technologies.length > 0
                ? project.technologies
                : ["HTML5", "CSS3", "JavaScript"];

            const techTagsHTML = techs
                .map((tech, index) => {
                    const cls = index % 3 === 0 ? "html" : index % 3 === 1 ? "css" : "js";
                    return `<span class="${cls}">${tech}</span>`;
                })
                .join("");

            card.innerHTML = `
                <div class="project-image">
                    <img
                        src="${project.image || 'imgs/portfolio project.png'}"
                        alt="${project.title}"
                        onerror="this.onerror=null; this.src='imgs/portfolio project.png';"
                    >
                    <div class="project-image-overlay">
                        <a href="${project.projectUrl || '#'}" class="project-preview" aria-label="View project" target="_blank">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                </div>

                <div class="project-content">
                    <div class="project-meta">
                        <span class="project-type">
                            <i class="fa-solid fa-code"></i>
                            ${project.projectType || "Frontend"} • ${project.category.toUpperCase()}
                        </span>
                        <span class="project-date">2026</span>
                    </div>

                    <h3>${project.title}</h3>

                    <p>${project.description}</p>

                    <div class="project-tech">
                        ${techTagsHTML}
                    </div>

                    <a href="${project.projectUrl || '#'}" class="project-link" target="_blank">
                        <span>View Project</span>
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            `;

            projectsGrid.appendChild(card);
        });
    }

    // 3. منطق الفلترة الديناميكي
    function initFiltering() {
        const filterButtons = document.querySelectorAll(".filter-btn"); // أزرار الفلتر في موقعك
        const cards = document.querySelectorAll(".project-card");

        if (filterButtons.length === 0) return;

        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                // إزالة كلاس active من كل الأزرار وإضافته للزر الحالي
                filterButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");

                // استخراج قيمة الفلتر (سواء من data-filter أو نص الزر)
                const filterValue = button.getAttribute("data-filter") || button.textContent.trim().toLowerCase();

                cards.forEach((card) => {
                    const cardCategory = card.dataset.category;

                    if (
                        filterValue === "all" || 
                        filterValue === "الكل" || 
                        cardCategory === filterValue
                    ) {
                        card.style.display = "block"; // إظهار الكارت
                    } else {
                        card.style.display = "none";  // إخفاء الكارت
                    }
                });
            });
        });
    }

    // تشغيل العملية عند تحميل الصفحة
    fetchAndRenderProjects();
});



/* =========================================================
   PORTFOLIO CONTACT FORM, LIVE TRACKING & ADMIN SHORTCUT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.location.port === "5500" ? "http://localhost:5000/api" : "/api";

  // 1. تسجيل المشاهدة والزائر الحقيقي تلقائياً عند فتح الموقع
  let visitorId = localStorage.getItem("portfolio_visitor_id");
  if (!visitorId) {
    visitorId = "vis_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("portfolio_visitor_id", visitorId);
  }

  fetch(`${API_BASE}/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, page: window.location.pathname }),
  }).catch(() => {});

  // 2. ربط فورم التواصل الحقيقي (#contactForm) بالباك إند
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("contactName").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const subject = document.getElementById("contactSubject").value.trim();
      const message = document.getElementById("contactMessage").value.trim();
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      if (!name || !email || !subject || !message) return;

      const originalHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending...</span> <i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const res = await fetch(`${API_BASE}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, subject, message }),
        });
        const data = await res.json();

        if (data.success) {
          contactForm.reset();
          submitBtn.innerHTML = '<span>Message Sent!</span> <i class="fa-solid fa-check"></i>';
          setTimeout(() => {
            submitBtn.innerHTML = originalHTML;
          }, 3000);
        } else {
          alert(data.message || "حدث خطأ أثناء إرسال الرسالة");
          submitBtn.innerHTML = originalHTML;
        }
      } catch (err) {
        alert("تعذر الاتصال بالسيرفر، تأكد من تشغيل الباك إند.");
        submitBtn.innerHTML = originalHTML;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // 3. اختصار الكيبورد لفتح صفحة تسجيل دخول الأدمن (Ctrl + Shift + D)
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      window.location.href = window.location.port === "5500" ? "../Admin/login.html" : "/admin";
    }
  });
});