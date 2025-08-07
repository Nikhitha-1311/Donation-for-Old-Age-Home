const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Donation = require('../models/Donation');

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, donorName, email, message } = req.body;

    // Validate input
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!donorName || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
      currency: 'inr',
      metadata: {
        donorName,
        email,
        message: message || ''
      }
    });

    // Save donation record
    const donation = new Donation({
      donorName,
      email,
      amount,
      stripePaymentIntentId: paymentIntent.id,
      message: message || ''
    });

    await donation.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      donationId: donation._id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment and update status
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update donation status
      await Donation.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        { status: 'succeeded' }
      );

      res.json({ 
        success: true, 
        message: 'Payment successful',
        donation: {
          amount: paymentIntent.amount / 100,
          donorName: paymentIntent.metadata.donorName,
          email: paymentIntent.metadata.email
        }
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Payment not completed',
        status: paymentIntent.status 
      });
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get donation status
router.get('/status/:donationId', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.donationId);
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({
      id: donation._id,
      status: donation.status,
      amount: donation.amount,
      donorName: donation.donorName,
      email: donation.email,
      createdAt: donation.createdAt
    });

  } catch (error) {
    console.error('Error fetching donation status:', error);
    res.status(500).json({ error: 'Failed to fetch donation status' });
  }
});

// Get all donations (for admin dashboard)
router.get('/donations', async (req, res) => {
  try {
    const donations = await Donation.find().sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

module.exports = router;
