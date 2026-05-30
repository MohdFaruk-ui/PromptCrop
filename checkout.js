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
const methodKofi = document.getElementById("method-kofi");
const methodUpiQr = document.getElementById("method-upi-qr");
const razorpayContainer = document.getElementById("razorpay-method-container");
const kofiContainer = document.getElementById("kofi-method-container");
const upiQrContainer = document.getElementById("upi-qr-method-container");

// Ko-fi checkout fields
const kofiEmail = document.getElementById("kofi-email");
const btnProceedKofi = document.getElementById("btn-proceed-kofi");

// Ko-fi Shop links matching selected plan amount
const KOFI_PLAN_URLS = {
  99: "https://ko-fi.com/s/a9abcc6b72",       // Starter (200 Scans)
  199: "https://ko-fi.com/s/43bbbcd320",      // Pro (1000 Scans)
  499: "https://ko-fi.com/s/f27bc524d7"      // Unlimited Lifetime
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
      const amount = parseInt(button.getAttribute("data-amount"), 10);
      const desc = button.getAttribute("data-desc");
      if (typeof window.openPurchaseModal === "function") {
        window.openPurchaseModal(amount, desc);
      }
    });
  });
});


// -------------------------------------------------------------
// Modal Action Functions
// -------------------------------------------------------------
// Open Modal Function
window.openPurchaseModal = function (amount, description) {
  selectedAmount = amount;
  selectedDescription = description;
  
  // Update UI elements in modal
  if (upiAmountDisplay) {
    upiAmountDisplay.textContent = `₹${amount}`;
  }
  
  // Set up the dynamic UPI URL and QR Code
  generateUpiQrCode(amount);

  // Reset payment tabs back to default (Razorpay)
  selectPaymentMethod("razorpay");

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
  if (methodKofi) methodKofi.classList.remove("active");
  if (methodUpiQr) methodUpiQr.classList.remove("active");

  // Hide all containers
  if (razorpayContainer) razorpayContainer.classList.add("hidden");
  if (kofiContainer) kofiContainer.classList.add("hidden");
  if (upiQrContainer) upiQrContainer.classList.add("hidden");

  // Show selected method and containers
  if (method === "razorpay") {
    if (methodRazorpay) methodRazorpay.classList.add("active");
    if (razorpayContainer) razorpayContainer.classList.remove("hidden");
  } else if (method === "kofi") {
    if (methodKofi) methodKofi.classList.add("active");
    if (kofiContainer) kofiContainer.classList.remove("hidden");
    if (kofiEmail) kofiEmail.focus();
  } else if (method === "upi-qr") {
    if (methodUpiQr) methodUpiQr.classList.add("active");
    if (upiQrContainer) upiQrContainer.classList.remove("hidden");
  }
}

if (methodRazorpay) {
  methodRazorpay.addEventListener("click", () => selectPaymentMethod("razorpay"));
}
if (methodKofi) {
  methodKofi.addEventListener("click", () => selectPaymentMethod("kofi"));
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
// Proceed to International Checkout (Ko-fi Shop)
// -------------------------------------------------------------
if (btnProceedKofi) {
  btnProceedKofi.addEventListener("click", () => {
    const email = kofiEmail.value.trim();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    const kofiUrl = KOFI_PLAN_URLS[selectedAmount];
    if (!kofiUrl) {
      alert("Selected plan is not configured for Ko-fi. Please try another payment method.");
      return;
    }

    // Open in a new tab for a smooth experience
    window.open(kofiUrl, "_blank");

    // Close checkout modal
    closeModal();
  });
}

// Synchronize inputs between Razorpay and Ko-fi email fields for UI convenience
if (checkoutEmail && kofiEmail) {
  checkoutEmail.addEventListener("input", () => {
    kofiEmail.value = checkoutEmail.value;
  });
  kofiEmail.addEventListener("input", () => {
    checkoutEmail.value = kofiEmail.value;
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
