/**
 * SnapTextify - Checkout and Interactivity Script
 * Copyright (c) 2026 FarKode. All rights reserved.
 */

// -------------------------------------------------------------
// Configurable Constants (Update these for production)
// -------------------------------------------------------------
// Define the API URL of your Node.js backend. Update this once hosted live (e.g. Render/Vercel URL).
const BACKEND_URL = "https://api.snaptextify.com";

// Chrome Web Store Download Link (Update this once your extension is published)
const DOWNLOAD_URL = "https://chromewebstore.google.com/detail/snaptextify-ocr/ledjnblkfpcjocaojgeiefecgkalgkjh";

// Your Personal UPI ID for receiving payments directly (No Business Account required!)
const DEVELOPER_UPI_ID = "yfspicy@ybl"; 

// -------------------------------------------------------------
// Geographic Location Detection & Pricing Tables (Section 4 checkout improvements)
// -------------------------------------------------------------
let userCountry = "IN"; // Default country
let userCurrency = "INR"; // Default currency

const PRICING_CONFIG = {
  INR: {
    symbol: "₹",
    starter: { price: 149, displayPrice: "₹149", credits: 300, desc: "Starter Pack (300 Scans)" },
    pro: { price: 399, displayPrice: "₹399", credits: 1500, desc: "Pro Pack (1500 Scans)" },
    unlimited: { price: 799, displayPrice: '₹799 <span style="font-size: 14px; text-decoration: line-through; opacity: 0.5; margin-left: 8px;">₹999</span>', credits: "Unlimited", desc: "Unlimited Lifetime Premium" }
  },
  USD: {
    symbol: "$",
    starter: { price: 4.99, displayPrice: "$4.99", credits: 300, desc: "Starter Pack (300 Scans)" },
    pro: { price: 12.99, displayPrice: "$12.99", credits: 1500, desc: "Pro Pack (1500 Scans)" },
    unlimited: { price: 19.99, displayPrice: '$19.99 <span style="font-size: 14px; text-decoration: line-through; opacity: 0.5; margin-left: 8px;">$29.99</span>', credits: "Unlimited", desc: "Unlimited Lifetime Premium" }
  }
};

async function detectUserLocation() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data && data.country_code) {
        userCountry = data.country_code;
        userCurrency = (userCountry === "IN") ? "INR" : "USD";
        console.log(`Detected country: ${userCountry}, Currency: ${userCurrency}`);
      }
    }
  } catch (err) {
    console.warn("Geo-IP detection failed, using timezone fallback:", err);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !tz.includes("Calcutta") && !tz.includes("Asia/Kolkata")) {
      userCountry = "US";
      userCurrency = "USD";
    }
  }
  applyGeographicPricing();
}

function applyGeographicPricing() {
  const config = PRICING_CONFIG[userCurrency];
  if (!config) return;

  const starterPriceEl = document.getElementById("starter-price");
  const proPriceEl = document.getElementById("pro-price");
  const unlimitedPriceEl = document.getElementById("unlimited-price");
  const heroCtaEl = document.getElementById("hero-pricing-cta");

  if (starterPriceEl) starterPriceEl.innerHTML = config.starter.displayPrice;
  if (proPriceEl) proPriceEl.innerHTML = config.pro.displayPrice;
  if (unlimitedPriceEl) unlimitedPriceEl.innerHTML = config.unlimited.displayPrice;

  if (heroCtaEl) {
    if (userCurrency === "INR") {
      heroCtaEl.textContent = "Unlock Premium (from ₹149)";
    } else {
      heroCtaEl.textContent = "Unlock Premium (from $4.99)";
    }
  }
}

function applyGeographicCheckoutUI() {
  const selector = document.querySelector(".payment-method-selector");
  if (userCurrency === "INR") {
    if (selector) selector.style.display = "flex";
    if (methodDodopayments) methodDodopayments.style.display = "none";
    selectPaymentMethod("razorpay");
  } else {
    if (selector) selector.style.display = "none";
    if (methodDodopayments) methodDodopayments.style.display = "inline-block";
    selectPaymentMethod("dodopayments");
  }
}


// -------------------------------------------------------------
// DOM Elements
// -------------------------------------------------------------
const purchaseModal = document.getElementById("purchase-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnProceedPayment = document.getElementById("btn-proceed-payment");
const checkoutEmail = document.getElementById("checkout-email");

const cardForm = document.getElementById("modal-card-form");
const cardSuccess = document.getElementById("modal-card-success");
const successEmailText = document.getElementById("success-email-text");
const btnCloseSuccess = document.getElementById("btn-close-success");

// Payment Method Selectors
const methodRazorpay = document.getElementById("method-razorpay");
const methodDodopayments = document.getElementById("method-dodopayments");
const methodUpiQr = document.getElementById("method-upi-qr");
const razorpayContainer = document.getElementById("razorpay-method-container");
const dodopaymentsContainer = document.getElementById("dodopayments-method-container");
const upiQrContainer = document.getElementById("upi-qr-method-container");

// Dodo Payments checkout fields
const dodopaymentsEmail = document.getElementById("dodopayments-email");
const btnProceedDodopayments = document.getElementById("btn-proceed-dodopayments");

// Dodo Payments Shop links matching selected plans
// Replace these with your actual Dodo Payments Product checkout URLs
const DODO_PAYMENTS_PLAN_URLS = {
  starter: "https://checkout.dodopayments.com/buy/pdt_0Ng6jt5orc4Tf1uFT23G2",
  pro: "https://checkout.dodopayments.com/buy/pdt_0Ng6k2Jisg8WF69zC9Wkc",
  unlimited: "https://checkout.dodopayments.com/buy/pdt_0Ng6kCSEpXeRY0fgK2Mfy"
};

// UPI Details DOM
const upiQrImage = document.getElementById("upi-qr-image");
const upiIdDisplay = document.getElementById("upi-id-display");
const btnCopyUpiId = document.getElementById("btn-copy-upi-id");
const upiAmountDisplay = document.getElementById("upi-amount-display");

let selectedAmount = 0;
let selectedDescription = "";
let finalUpiAmount = 0;


// -------------------------------------------------------------
// Initialization & Extension Download Bindings
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Detect geographic location
  detectUserLocation();

  // Set Download links dynamically for all layout download buttons
  document.querySelectorAll(".link-download-ext").forEach(link => {
    link.href = DOWNLOAD_URL;
    link.target = "_blank";
  });

  // Display UPI ID in the checkout details
  if (upiIdDisplay) {
    upiIdDisplay.textContent = DEVELOPER_UPI_ID;
  }

  // Bind Buy Pack buttons dynamically to open the payment modal
  document.querySelectorAll(".btn-buy-pack").forEach(button => {
    button.addEventListener("click", () => {
      const plan = button.getAttribute("data-plan");
      const desc = button.getAttribute("data-desc");
      if (typeof window.openPurchaseModal === "function") {
        window.openPurchaseModal(plan, desc);
      }
    });
  });

  // Initialize Dodo Payments overlay SDK
  if (window.DodoPaymentsCheckout && window.DodoPaymentsCheckout.DodoPayments) {
    window.DodoPaymentsCheckout.DodoPayments.Initialize({
      mode: "test", // Change to "live" when deploying to production
      displayType: "overlay",
      onEvent: (event) => {
        console.log("Dodo Payments event:", event);
      }
    });
  }
});


// -------------------------------------------------------------
// Modal Action Functions
// -------------------------------------------------------------
// Open Modal Function
let selectedPlan = "";

// Open Modal Function
window.openPurchaseModal = function (plan, description) {
  selectedPlan = plan;
  
  // Get plan details dynamically based on currency
  const planDetails = PRICING_CONFIG[userCurrency]?.[plan] || { price: 99, desc: description };
  selectedAmount = planDetails.price;
  selectedDescription = planDetails.desc;
  
  // Update modal title
  const modalTitleEl = document.getElementById("purchase-modal-title");
  if (modalTitleEl) {
    modalTitleEl.textContent = `Upgrade: ${description}`;
  }

  // Update UI elements in modal
  if (upiAmountDisplay) {
    upiAmountDisplay.textContent = `₹${selectedAmount}`;
  }
  
  // Set up the dynamic UPI URL and QR Code (only relevant for India)
  if (userCurrency === "INR") {
    generateUpiQrCode(selectedAmount);
  }

  // Configure tab visibility and default selection based on country
  applyGeographicCheckoutUI();

  if (purchaseModal) purchaseModal.classList.remove("hidden");
  if (cardForm) cardForm.classList.remove("hidden");
  if (cardSuccess) cardSuccess.classList.add("hidden");
  if (checkoutEmail) checkoutEmail.focus();
};

// Close Modal
const closeModal = () => {
  if (purchaseModal) purchaseModal.classList.add("hidden");
  if (checkoutEmail) checkoutEmail.value = "";
};
if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
if (btnCloseSuccess) btnCloseSuccess.addEventListener("click", closeModal);


// -------------------------------------------------------------
// Payment Tab Switching & QR Generator
// -------------------------------------------------------------
function selectPaymentMethod(method) {
  // Reset active classes
  if (methodRazorpay) methodRazorpay.classList.remove("active");
  if (methodDodopayments) methodDodopayments.classList.remove("active");
  if (methodUpiQr) methodUpiQr.classList.remove("active");

  // Hide all containers
  if (razorpayContainer) razorpayContainer.classList.add("hidden");
  if (dodopaymentsContainer) dodopaymentsContainer.classList.add("hidden");
  if (upiQrContainer) upiQrContainer.classList.add("hidden");

  // Show selected method and containers
  if (method === "razorpay") {
    if (methodRazorpay) methodRazorpay.classList.add("active");
    if (razorpayContainer) razorpayContainer.classList.remove("hidden");
  } else if (method === "dodopayments") {
    if (methodDodopayments) methodDodopayments.classList.add("active");
    if (dodopaymentsContainer) dodopaymentsContainer.classList.remove("hidden");
    if (dodopaymentsEmail) dodopaymentsEmail.focus();
  } else if (method === "upi-qr") {
    if (methodUpiQr) methodUpiQr.classList.add("active");
    if (upiQrContainer) upiQrContainer.classList.remove("hidden");
  }
}

if (methodRazorpay) {
  methodRazorpay.addEventListener("click", () => selectPaymentMethod("razorpay"));
}
if (methodDodopayments) {
  methodDodopayments.addEventListener("click", () => selectPaymentMethod("dodopayments"));
}
if (methodUpiQr) {
  methodUpiQr.addEventListener("click", () => selectPaymentMethod("upi-qr"));
}

// Generate QR Code via standard UPI deep link schema
// Generate QR Code via standard UPI deep link schema with dynamic paise suffix
function generateUpiQrCode(amount) {
  if (!upiQrImage) return;

  // Generate a random paise suffix (between .01 and .99)
  const paise = Math.floor(Math.random() * 99) + 1;
  finalUpiAmount = amount + (paise / 100);

  // Update the displayed amount to show the dynamic amount
  if (upiAmountDisplay) {
    upiAmountDisplay.textContent = `₹${finalUpiAmount.toFixed(2)}`;
  }

  // Standard UPI payment URI format
  const pn = encodeURIComponent("SnapTextify");
  const tn = encodeURIComponent(`License ${selectedDescription}`);
  const upiUri = `upi://pay?pa=${DEVELOPER_UPI_ID}&pn=${pn}&am=${finalUpiAmount.toFixed(2)}&cu=INR&tn=${tn}`;
  
  // Render using free public QR generator API
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUri)}`;
  upiQrImage.src = qrApiUrl;
}

// UTR Submission Form Hookups
const btnSubmitUpiProof = document.getElementById("btn-submit-upi-proof");
const upiUserEmail = document.getElementById("upi-user-email");
const upiUtr = document.getElementById("upi-utr");
const upiSubmissionStatus = document.getElementById("upi-submission-status");

if (upiUtr) {
  upiUtr.addEventListener("input", (e) => {
    // Sanitize to digits only
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });
}

if (btnSubmitUpiProof) {
  btnSubmitUpiProof.addEventListener("click", async () => {
    const email = upiUserEmail ? upiUserEmail.value.trim() : "";
    const utr = upiUtr ? upiUtr.value.trim() : "";
    
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    
    if (!utr || !/^\d{12}$/.test(utr)) {
      alert("Please enter a valid 12-digit UPI Transaction ID / UTR (numbers only).");
      return;
    }
    
    btnSubmitUpiProof.disabled = true;
    btnSubmitUpiProof.textContent = "Submitting...";
    if (upiSubmissionStatus) {
      upiSubmissionStatus.textContent = "";
      upiSubmissionStatus.style.color = "var(--text-muted)";
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment/submit-manual-upi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          planName: selectedPlan,
          amount: finalUpiAmount.toFixed(2),
          utr: utr
        })
      });
      
      if (response.ok) {
        if (upiSubmissionStatus) {
          upiSubmissionStatus.innerHTML = `<span style="color: var(--success);">✓ Verification request submitted!</span><br><p style="font-size: 11px; margin-top: 5px; color: var(--text-muted); font-weight: normal; line-height: 1.4;">Once we verify the transaction of ₹${finalUpiAmount.toFixed(2)} in our bank account, your key will be generated and sent to: <strong>${email}</strong> (typically in 10-15 mins).</p>`;
        }
        btnSubmitUpiProof.textContent = "Verification Submitted";
        if (upiUtr) upiUtr.value = "";
      } else {
        const errData = await response.json().catch(() => ({ error: "Failed to submit request" }));
        if (upiSubmissionStatus) {
          upiSubmissionStatus.innerHTML = `<span style="color: var(--error);">❌ Submission Failed: ${errData.error || "Server error"}</span>`;
        }
        btnSubmitUpiProof.disabled = false;
        btnSubmitUpiProof.textContent = "Submit Payment Verification";
      }
    } catch (err) {
      if (upiSubmissionStatus) {
        upiSubmissionStatus.innerHTML = `<span style="color: var(--error);">❌ Connection Error: ${err.message}</span>`;
      }
      btnSubmitUpiProof.disabled = false;
      btnSubmitUpiProof.textContent = "Submit Payment Verification";
    }
  });
}

// Copy UPI ID Action
if (btnCopyUpiId) {
  btnCopyUpiId.addEventListener("click", () => {
    navigator.clipboard.writeText(DEVELOPER_UPI_ID).then(() => {
      btnCopyUpiId.textContent = "Copied!";
      setTimeout(() => {
        btnCopyUpiId.textContent = "Copy ID";
      }, 1500);
    });
  });
}


// -------------------------------------------------------------
// Proceed to Automatic Payment (Razorpay)
// -------------------------------------------------------------
if (btnProceedPayment) {
  btnProceedPayment.addEventListener("click", async () => {
    const email = checkoutEmail.value.trim();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    btnProceedPayment.textContent = "Processing...";
    btnProceedPayment.disabled = true;

    try {
      // Step 1: Create Razorpay Order on your Backend
      const response = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          amount: selectedAmount
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create payment order on backend.");
      }

      const data = await response.json();
      
      if (!data.success || !data.orderId) {
        throw new Error(data.error || "Order creation rejected.");
      }

      // Step 2: Open Razorpay checkout pop-up on the client side
      const options = {
        key: "rzp_live_xxxxxxxxxxxxxx", // REPLACE THIS WITH YOUR REAL RAZORPAY KEY ID (e.g. rzp_live_...)
        amount: data.amount,
        currency: data.currency, // INR
        name: "SnapTextify",
        description: selectedDescription,
        order_id: data.orderId,
        prefill: {
          email: email
        },
        theme: {
          color: "#a020f0" // Neon purple theme
        },
        handler: function (response) {
          // This function is executed when payment succeeds on frontend
          console.log("Razorpay Payment Success:", response);
          
          // Show Success screen
          successEmailText.textContent = email;
          cardForm.classList.add("hidden");
          cardSuccess.classList.remove("hidden");
        },
        modal: {
          ondismiss: function () {
            btnProceedPayment.textContent = "Proceed to Payment";
            btnProceedPayment.disabled = false;
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert(`Payment error: ${err.message || "Failed to initialize checkout."}`);
      btnProceedPayment.textContent = "Proceed to Payment";
      btnProceedPayment.disabled = false;
    }
  });
}

// -------------------------------------------------------------
// Proceed to International Checkout (Dodo Payments Overlay)
// -------------------------------------------------------------
window.createDodoPaymentsCheckout = function(url, email) {
  if (window.DodoPaymentsCheckout && window.DodoPaymentsCheckout.DodoPayments) {
    try {
      const checkoutUrl = new URL(url);
      if (email) {
        checkoutUrl.searchParams.set("email", email);
      }
      window.DodoPaymentsCheckout.DodoPayments.Checkout.open({
        checkoutUrl: checkoutUrl.toString()
      });
    } catch (e) {
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
};

if (btnProceedDodopayments) {
  btnProceedDodopayments.addEventListener("click", () => {
    const email = dodopaymentsEmail.value.trim();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    const checkoutUrl = DODO_PAYMENTS_PLAN_URLS[selectedPlan];
    if (!checkoutUrl) {
      alert("Selected plan is not configured for Dodo Payments.");
      return;
    }

    // Open Dodo Payments Modal Overlay
    window.createDodoPaymentsCheckout(checkoutUrl, email);

    // Close checkout modal
    closeModal();
  });
}

// Synchronize inputs between Razorpay and Dodo Payments email fields for UI convenience
if (checkoutEmail && dodopaymentsEmail) {
  checkoutEmail.addEventListener("input", () => {
    dodopaymentsEmail.value = checkoutEmail.value;
  });
  dodopaymentsEmail.addEventListener("input", () => {
    checkoutEmail.value = dodopaymentsEmail.value;
  });
}


// -------------------------------------------------------------
// Interactive UI Visual Effects
// -------------------------------------------------------------
// Card Spotlight Mouse Tracking Effect (Interactive Design Spell)
document.querySelectorAll('.feature-card, .demo-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  });
});

// FAQ Accordion Toggle Interaction
document.querySelectorAll(".faq-question").forEach(question => {
  question.addEventListener("click", () => {
    const item = question.parentElement;
    const isActive = item.classList.contains("active");
    
    // Close other FAQ items
    document.querySelectorAll(".faq-item").forEach(i => i.classList.remove("active"));
    
    // If it wasn't active, open it
    if (!isActive) {
      item.classList.add("active");
    }
  });
});


// -------------------------------------------------------------
// Dedicated Support Form Submission & Floating Widget Toggle
// -------------------------------------------------------------
const supportTrigger = document.getElementById("support-trigger");
const supportCard = document.getElementById("support-card");
const supportCardClose = document.getElementById("support-card-close");
const supportForm = document.getElementById("support-form");
const btnSubmitSupport = document.getElementById("btn-submit-support");
const supportStatus = document.getElementById("support-status");

// Toggle support card visibility
if (supportTrigger && supportCard) {
  supportTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    supportCard.classList.toggle("hidden");
  });
  
  if (supportCardClose) {
    supportCardClose.addEventListener("click", (e) => {
      e.stopPropagation();
      supportCard.classList.add("hidden");
    });
  }
  
  // Close support card when clicking outside the widget
  document.addEventListener("click", (e) => {
    if (!supportCard.contains(e.target) && !supportTrigger.contains(e.target)) {
      supportCard.classList.add("hidden");
    }
  });
}

// Form Submission Handler
if (supportForm) {
  supportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("support-name").value.trim();
    const email = document.getElementById("support-email").value.trim();
    const type = document.getElementById("support-type").value;
    const message = document.getElementById("support-message").value.trim();
    
    if (!name || !email || !message) {
      alert("Please fill in all fields.");
      return;
    }
    
    btnSubmitSupport.disabled = true;
    btnSubmitSupport.textContent = "Sending...";
    if (supportStatus) {
      supportStatus.textContent = "";
      supportStatus.style.color = "inherit";
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/support/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, type, message })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (supportStatus) {
          supportStatus.innerHTML = '<span style="color: var(--success); font-weight: 600;">✓ Message sent successfully! We will reply shortly.</span>';
        }
        supportForm.reset();
        
        // Auto-close card after 3 seconds on success
        setTimeout(() => {
          if (supportCard && !supportCard.classList.contains("hidden")) {
            supportCard.classList.add("hidden");
            if (supportStatus) supportStatus.textContent = "";
          }
        }, 3000);
      } else {
        if (supportStatus) {
          supportStatus.innerHTML = `<span style="color: var(--error);">❌ Error: ${data.error || "Failed to send message"}</span>`;
        }
      }
    } catch (err) {
      if (supportStatus) {
        supportStatus.innerHTML = `<span style="color: var(--error);">❌ Connection Error: ${err.message}</span>`;
      }
    } finally {
      btnSubmitSupport.disabled = false;
      btnSubmitSupport.textContent = "Submit Inquiry";
    }
  });
}

// -------------------------------------------------------------
// Scroll Reveal Animation (IntersectionObserver)
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".reveal-element");
  
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target); // Reveal once
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -20px 0px"
    });
    
    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback if IntersectionObserver is not supported
    revealElements.forEach((el) => el.classList.add("revealed"));
  }
});
