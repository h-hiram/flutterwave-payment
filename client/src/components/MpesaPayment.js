import React, { useState } from 'react';
import axios from 'axios';

const MpesaPayment = () => {
  // State for form fields
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Format phone number to international format (254XXXXXXXXX)
  const formatPhoneNumber = (phone) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If number starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If number doesn't start with 254, add it
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  };

  // Validate phone number format
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPaymentStatus(null);
    setLoading(true);

    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Safaricom phone number');
      setLoading(false);
      return;
    }

    // Format phone number to international format
    const formattedPhone = formatPhoneNumber(phone);

    try {
      // Prepare the request payload
      const payload = {
        amount: parseFloat(amount),
        phone_number: formattedPhone,
        email: email || undefined,
        customer: {
          email: email || undefined,
          phone_number: formattedPhone,
          name: name || undefined
        }
      };

      // Make the API request to our backend
      const response = await axios.post('/api/mpesa-pay', payload);

      if (response.data.success) {
        setSuccess(response.data.message);
        setPaymentStatus('pending');
        
        // Start polling for payment status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(
              `https://api.flutterwave.com/v3/transactions/${response.data.data.data.id}/verify`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.SECRET_KEY}`
                }
              }
            );
            
            if (statusResponse.data.data.status === 'successful') {
              setPaymentStatus('success');
              clearInterval(pollInterval);
            } else if (statusResponse.data.data.status === 'failed') {
              setPaymentStatus('failed');
              setError('Payment failed. Please try again.');
              clearInterval(pollInterval);
            }
          } catch (err) {
            console.error('Error checking payment status:', err);
          }
        }, 5000); // Poll every 5 seconds

        // Clear form on success
        setPhone('');
        setAmount('');
        setEmail('');
        setName('');
      } else {
        setError(response.data.message || 'Failed to initiate payment. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Pay with M-Pesa</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., 0712345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your Safaricom phone number
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (KES)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email (Optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (Optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || paymentStatus === 'pending'}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading || paymentStatus === 'pending'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : paymentStatus === 'pending' ? (
            'Waiting for M-Pesa prompt...'
          ) : (
            'Pay with M-Pesa'
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
          {success}
        </div>
      )}

      {paymentStatus === 'pending' && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-md text-center">
          Please check your phone for the M-Pesa prompt and complete the payment.
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
          Payment successful! Thank you for your payment.
        </div>
      )}
    </div>
  );
};

export default MpesaPayment; 