/**
 * PromptCrop OCR - Checkout and Interactivity Script
 * Copyright (c) 2026 Faruk. All rights reserved.
 */

// -------------------------------------------------------------
// Configurable Constants (Update these for production)
// -------------------------------------------------------------
// Define the API URL of your Node.js backend. Update this once hosted live (e.g. Render/Vercel URL).
const BACKEND_URL = "https://promptcrop-backend.onrender.com";

// Chrome Web Store Download Link (Update this once your extension is published)
const DOWNLOAD_URL = "https://chromewebstore.google.com/detail/promptcrop-ocr/your-extension-id-here";

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
    selectPaymentMethod("razorpay");
  } else {
    if (selector) selector.style.display = "none";
    selectPaymentMethod("lemonsqueezy");
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
const methodLemonsqueezy = document.getElementById("method-lemonsqueezy");
const methodUpiQr = document.getElementById("method-upi-qr");
const razorpayContainer = document.getElementById("razorpay-method-container");
const lemonsqueezyContainer = document.getElementById("lemonsqueezy-method-container");
const upiQrContainer = document.getElementById("upi-qr-method-container");

// Lemon Squeezy checkout fields
const lemonsqueezyEmail = document.getElementById("lemonsqueezy-email");
const btnProceedLemonsqueezy = document.getElementById("btn-proceed-lemonsqueezy");

// Lemon Squeezy Shop links matching selected plans
const LEMON_SQUEEZY_PLAN_URLS = {
  starter: "https://promptcrop.lemonsqueezy.com/checkout/buy/8a72a08c-905c-4be6-8e5b-b9fbf3b3ab0e",
  pro: "https://promptcrop.lemonsqueezy.com/checkout/buy/426a8f3b-313d-4952-ba15-ec587b1cbf30",
  unlimited: "https://promptcrop.lemonsqueezy.com/checkout/buy/78e5f1b1-21bb-4592-a1f1-e9ee5f33f678"
};

// UPI Details DOM
const upiQrImage = document.getElementById("upi-qr-image");
const upiIdDisplay = document.getElementById("upi-id-display");
const btnCopyUpiId = document.getElementById("btn-copy-upi-id");
const upiAmountDisplay = document.getElementById("upi-amount-display");

let selectedAmount = 0;
let selectedDescription = "";


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
  if (methodLemonsqueezy) methodLemonsqueezy.classList.remove("active");
  if (methodUpiQr) methodUpiQr.classList.remove("active");

  // Hide all containers
  if (razorpayContainer) razorpayContainer.classList.add("hidden");
  if (lemonsqueezyContainer) lemonsqueezyContainer.classList.add("hidden");
  if (upiQrContainer) upiQrContainer.classList.add("hidden");

  // Show selected method and containers
  if (method === "razorpay") {
    if (methodRazorpay) methodRazorpay.classList.add("active");
    if (razorpayContainer) razorpayContainer.classList.remove("hidden");
  } else if (method === "lemonsqueezy") {
    if (methodLemonsqueezy) methodLemonsqueezy.classList.add("active");
    if (lemonsqueezyContainer) lemonsqueezyContainer.classList.remove("hidden");
    if (lemonsqueezyEmail) lemonsqueezyEmail.focus();
  } else if (method === "upi-qr") {
    if (methodUpiQr) methodUpiQr.classList.add("active");
    if (upiQrContainer) upiQrContainer.classList.remove("hidden");
  }
}

if (methodRazorpay) {
  methodRazorpay.addEventListener("click", () => selectPaymentMethod("razorpay"));
}
if (methodLemonsqueezy) {
  methodLemonsqueezy.addEventListener("click", () => selectPaymentMethod("lemonsqueezy"));
}
if (methodUpiQr) {
  methodUpiQr.addEventListener("click", () => selectPaymentMethod("upi-qr"));
}

// Generate QR Code via standard UPI deep link schema
function generateUpiQrCode(amount) {
  if (!upiQrImage) return;

  // Standard UPI payment URI format
  const pn = encodeURIComponent("PromptCrop OCR");
  const tn = encodeURIComponent(`License ${selectedDescription}`);
  const upiUri = `upi://pay?pa=${DEVELOPER_UPI_ID}&pn=${pn}&am=${amount}&cu=INR&tn=${tn}`;
  
  // Render using free public QR generator API
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUri)}`;
  upiQrImage.src = qrApiUrl;
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
        name: "PromptCrop OCR",
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
// Proceed to International Checkout (Lemon Squeezy Overlay)
// -------------------------------------------------------------
window.createLemonSqueezyCheckout = function(url, email) {
  if (window.LemonSqueezy) {
    try {
      const checkoutUrl = new URL(url);
      if (email) {
        checkoutUrl.searchParams.set("checkout[email]", email);
      }
      window.LemonSqueezy.Url.Open(checkoutUrl.toString());
    } catch (e) {
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
};

if (btnProceedLemonsqueezy) {
  btnProceedLemonsqueezy.addEventListener("click", () => {
    const email = lemonsqueezyEmail.value.trim();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    const checkoutUrl = LEMON_SQUEEZY_PLAN_URLS[selectedPlan];
    if (!checkoutUrl) {
      alert("Selected plan is not configured for Lemon Squeezy.");
      return;
    }

    // Open Lemon Squeezy Modal Overlay
    window.createLemonSqueezyCheckout(checkoutUrl, email);

    // Close checkout modal
    closeModal();
  });
}

// Synchronize inputs between Razorpay and Lemon Squeezy email fields for UI convenience
if (checkoutEmail && lemonsqueezyEmail) {
  checkoutEmail.addEventListener("input", () => {
    lemonsqueezyEmail.value = checkoutEmail.value;
  });
  lemonsqueezyEmail.addEventListener("input", () => {
    checkoutEmail.value = lemonsqueezyEmail.value;
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
