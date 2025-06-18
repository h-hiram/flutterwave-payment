const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const FLW_BASE = 'https://api.flutterwave.com/v3/charges';
const { SECRET_KEY, ENCRYPTION_KEY } = process.env;

app.get('/', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Flutterwave Payment API is running',
    mode: 'test',
    endpoints: {
      mobile_money: '/api/pay',
      card_payment: '/api/card-pay'
    }
  });
});
app.get('/health', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Helper: Encrypt payload for card payments
const encrypt = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex')
  };
};

const formatPhoneNumber = (phone) => {

  let cleaned = phone.replace(/\D/g, '');
  
  
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
};


const validatePhoneNumber = (phone) => {
  const phoneRegex = /^(\+254|0)[17]\d{8}$/;
  return phoneRegex.test(phone);
};

const validateCardNumber = (number) => {
  return /^\d{16}$/.test(number.replace(/\s/g, ''));
};

const validateExpiry = (expiry) => {
  const [month, year] = expiry.split('/');
  if (!month || !year) return false;
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  return (
    /^\d{2}$/.test(month) &&
    /^\d{2}$/.test(year) &&
    parseInt(month) >= 1 &&
    parseInt(month) <= 12 &&
    (parseInt(year) > currentYear || (parseInt(year) === currentYear && parseInt(month) >= currentMonth))
  );
};


app.post('/api/pay', async (req, res) => {
  const { amount, phone, network, email } = req.body;
  
  
  if (!amount || !phone || !network || !email) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  
  if (!validatePhoneNumber(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  if (amount < 1) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
  }


  const formattedPhone = formatPhoneNumber(phone);
  let type = network === 'mpesa' ? 'mpesa' : 'airtel';
  
  try {
    console.log('\n=== Payment Request Details ===');
    console.log('Phone (original):', phone);
    console.log('Phone (formatted):', formattedPhone);
    console.log('Amount:', amount);
    console.log('Network:', type);
    console.log('Email:', email);
    
  
    const paymentPayload = {
      tx_ref: `tx-${Date.now()}`,
      amount: parseFloat(amount),
      currency: 'KES',
      email: email,
      phone_number: formattedPhone,
      customer: {
        email,
        phone_number: formattedPhone,
        name: 'Customer'
      },
      customizations: {
        title: `${type.toUpperCase()} Payment`,
        description: `Complete your payment using ${type.toUpperCase()}`
      }
    };

    console.log('\n=== Flutterwave Request ===');
    console.log('URL:', `${FLW_BASE}?type=${type}`);
    console.log('Headers:', {
      'Authorization': `Bearer ${SECRET_KEY.substring(0, 10)}...`,
      'Content-Type': 'application/json'
    });
    console.log('Payload:', JSON.stringify(paymentPayload, null, 2));

    const response = await axios.post(
      `${FLW_BASE}?type=${type}`,
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n=== Flutterwave Response ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'success') {
      res.json({ 
        success: true, 
        data: response.data,
        message: `Please check your phone for the ${type.toUpperCase()} prompt to complete the payment.`
      });
    } else {
      console.error('\n=== Payment Failed ===');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      res.json({ 
        success: false, 
        message: response.data.message || 'Payment failed. Please try again.' 
      });
    }
  } catch (err) {
    console.error('\n=== Payment Error ===');
    console.error('Error message:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
    res.status(500).json({ 
      success: false, 
      message: err.response?.data?.message || 'Payment failed. Please try again.' 
    });
  }
});

// Card Payment
app.post('/api/card-pay', async (req, res) => {
  const { amount, number, cvv, expiry, email } = req.body;


  if (!amount || !number || !cvv || !expiry || !email) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  if (!validateCardNumber(number)) {
    return res.status(400).json({ success: false, message: 'Invalid card number.' });
  }

  if (!validateExpiry(expiry)) {
    return res.status(400).json({ success: false, message: 'Invalid expiry date.' });
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ success: false, message: 'Invalid CVV.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  if (amount < 1) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
  }

  try {
    const encryptedCard = encrypt(number);
    const response = await axios.post(
      `${FLW_BASE}?type=card`,
      {
        tx_ref: `tx-${Date.now()}`,
        amount,
        currency: 'KES',
        redirect_url: '',
        payment_type: 'card',
        card_number: encryptedCard.encrypted,
        cvv,
        expiry,
        email,
        encryption_key: encryptedCard.iv,
        customer: {
          email: email,
          name: 'Customer'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data.status === 'success') {
      console.log(`Card payment initiated successfully for ${email} - Amount: ${amount}`);
      res.json({ success: true, data: response.data });
    } else {
      console.error(`Card payment failed for ${email}: ${response.data.message}`);
      res.json({ success: false, message: response.data.message });
    }
  } catch (err) {
    console.error('Card payment error:', err.message);
    if (err.code === 'ECONNABORTED') {
      res.status(504).json({ success: false, message: 'Request timeout. Please try again.' });
    } else {
      res.status(500).json({ 
        success: false, 
        message: err.response?.data?.message || 'Payment failed. Please try again.' 
      });
    }
  }
});

app.post('/api/mpesa-pay', async (req, res) => {
  const { amount, phone_number, email, customer } = req.body;
  
  try {

    const paymentPayload = {
      tx_ref: `tx-${Date.now()}`,
      amount: parseFloat(amount),
      currency: 'KES',
      payment_type: 'mpesa',
      email: email,
      phone_number: phone_number,
      customer: customer,
      customizations: {
        title: 'M-Pesa Payment',
        description: 'Complete your payment using M-Pesa',
        logo: 'https://flutterwave.com/images/logo-colored.svg'
      }
    };

   
    const response = await axios.post(
      `${FLW_BASE}?type=mpesa`,
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      res.json({ 
        success: true, 
        data: response.data,
        message: 'Please check your phone for the M-Pesa prompt to complete the payment.'
      });
    } else {
      res.json({ 
        success: false, 
        message: response.data.message || 'Failed to initiate payment. Please try again.' 
      });
    }
  } catch (err) {
    console.error('M-Pesa payment error:', err.message);
    if (err.response?.data) {
      console.error('Error details:', JSON.stringify(err.response.data, null, 2));
    }
    res.status(500).json({ 
      success: false, 
      message: err.response?.data?.message || 'Payment failed. Please try again.' 
    });
  }
});


app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/`);
}); 