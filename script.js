// Stripe public key - this should be replaced with your actual publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_stripe_publishable_key_here';

// Initialize Stripe
let stripe;
let elements;
let cardElement;

// Initialize Stripe Elements when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Load Stripe.js
  const script = document.createElement('script');
  script.src = 'https://js.stripe.com/v3/';
  script.onload = initializeStripe;
  document.head.appendChild(script);
});

function initializeStripe() {
  stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  elements = stripe.elements();
  
  // Create card element
  const style = {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  };

  cardElement = elements.create('card', { style });
  cardElement.mount('#card-element');
  
  // Handle real-time validation errors
  cardElement.on('change', function(event) {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
      displayError.textContent = event.error.message;
    } else {
      displayError.textContent = '';
    }
  });
}

// Handle form submission
document.getElementById('donationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitButton = document.getElementById('submit-button');
  const buttonText = document.getElementById('button-text');
  const loadingSpinner = document.getElementById('loading-spinner');
  
  // Disable button and show loading
  submitButton.disabled = true;
  buttonText.style.display = 'none';
  loadingSpinner.style.display = 'inline';
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const message = document.getElementById('message').value;
  
  try {
    // Create payment intent on the server
    const response = await fetch('/api/payment/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        donorName: name,
        email: email,
        amount: amount,
        message: message
      }),
    });
    
    const { clientSecret, donationId } = await response.json();
    
    if (!clientSecret) {
      throw new Error('Failed to create payment intent');
    }
    
    // Confirm the payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: name,
          email: email
        }
      }
    });
    
    if (error) {
      // Show error to customer
      showMessage(error.message, 'error');
      resetButton();
    } else {
      // Payment succeeded
      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on server
        await fetch('/api/payment/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id
          }),
        });
        
        showMessage(`Thank you, ${name}! Your donation of ₹${amount} has been successfully processed.`, 'success');
        
        // Reset form
        document.getElementById('donationForm').reset();
        cardElement.clear();
        
        // Show success animation or redirect
        setTimeout(() => {
          window.location.href = '#donate';
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    showMessage('An error occurred while processing your donation. Please try again.', 'error');
    resetButton();
  }
});

function showMessage(messageText, type) {
  const messageDiv = document.getElementById('payment-result');
  const donationMessage = document.getElementById('donationMessage');
  
  messageDiv.style.display = 'block';
  messageDiv.textContent = messageText;
  messageDiv.className = `message ${type}`;
  
  donationMessage.textContent = messageText;
  donationMessage.className = `message ${type}`;
  
  // Auto-hide message after 5 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
    donationMessage.textContent = '';
    donationMessage.className = '';
  }, 5000);
}

function resetButton() {
  const submitButton = document.getElementById('submit-button');
  const buttonText = document.getElementById('button-text');
  const loadingSpinner = document.getElementById('loading-spinner');
  
  submitButton.disabled = false;
  buttonText.style.display = 'inline';
  loadingSpinner.style.display = 'none';
}

// Workflow Modal JavaScript - Text-based popup
let currentSlide = 0;
const slides = [
  {
    title: "Step 1: Donate",
    description: "Your contribution makes a real difference in the lives of elderly residents.",
    details: "Choose any amount you're comfortable with through our secure donation form. Every donation, no matter the size, helps provide essential care and support for our elderly residents."
  },
  {
    title: "Step 2: Fund Allocation",
    description: "Your donation is carefully reviewed and allocated to specific needs.",
    details: "Our team transparently reviews each donation and allocates funds to areas where they're needed most - whether it's medical care, nutritious meals, comfortable living spaces, or recreational activities."
  },
  {
    title: "Step 3: Implementation",
    description: "Funds are directly used to improve quality of life for residents.",
    details: "We use your donations to purchase medical supplies, improve facilities, provide nutritious meals, organize recreational activities, and ensure our elderly residents live with dignity and comfort."
  },
  {
    title: "Step 4: Monitoring",
    description: "Regular assessments ensure effective use of funds.",
    details: "We conduct regular assessments and quality checks to ensure every rupee is used effectively. Our monitoring process includes resident feedback, facility inspections, and outcome measurements."
  },
  {
    title: "Step 5: Reporting",
    description: "Impact updates shared transparently with donors.",
    details: "We provide regular updates on how your donations are making a difference. You'll receive impact reports, success stories, and photos showing the positive changes your support has enabled."
  }
];

// Modal Functions - Text-based
function openModal(slideIndex) {
  currentSlide = slideIndex;
  const modal = document.getElementById('workflowModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalDetails = document.getElementById('modalDetails');
  
  modal.style.display = 'block';
  modalTitle.textContent = slides[currentSlide].title;
  modalDescription.innerHTML = `<p>${slides[currentSlide].description}</p>`;
  modalDetails.innerHTML = `<p>${slides[currentSlide].details}</p>`;
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyPress);
}

function closeModal() {
  const modal = document.getElementById('workflowModal');
  modal.style.display = 'none';
  document.removeEventListener('keydown', handleKeyPress);
}

function changeSlide(direction) {
  currentSlide += direction;
  
  if (currentSlide >= slides.length) {
    currentSlide = 0;
  } else if (currentSlide < 0) {
    currentSlide = slides.length - 1;
  }
  
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalDetails = document.getElementById('modalDetails');
  
  modalTitle.textContent = slides[currentSlide].title;
  modalDescription.innerHTML = `<p>${slides[currentSlide].description}</p>`;
  modalDetails.innerHTML = `<p>${slides[currentSlide].details}</p>`;
}

function handleKeyPress(event) {
  if (event.key === 'Escape') {
    closeModal();
  } else if (event.key === 'ArrowLeft') {
    changeSlide(-1);
  } else if (event.key === 'ArrowRight') {
    changeSlide(1);
  }
}

// Close modal when clicking outside the image
window.onclick = function(event) {
  const modal = document.getElementById('workflowModal');
  if (event.target === modal) {
    closeModal();
  }
};

// Add some CSS for messages
const style = document.createElement('style');
style.textContent = `
  .message {
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  #card-element {
    margin: 20px 0;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  #submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);
