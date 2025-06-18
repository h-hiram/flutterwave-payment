import React, { useState } from 'react';

const paymentMethods = [
  { label: 'M-Pesa', value: 'mpesa' },
  { label: 'Airtel Money', value: 'airtel' },
  { label: 'Card', value: 'card' },
];


const formatPhoneNumber = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned;
  }
  return cleaned.slice(0, 10);
};

const formatCardNumber = (value) => {
  const cleaned = value.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
};

const formatExpiry = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return cleaned;
};

export default function App() {
  const [method, setMethod] = useState('mpesa');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!amount || amount < 1) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (method === 'mpesa' || method === 'airtel') {
      if (!phone || phone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    } else {
      if (!card.number || card.number.replace(/\s/g, '').length !== 16) {
        newErrors.cardNumber = 'Please enter a valid card number';
      }
      if (!card.expiry || !/^\d{2}\/\d{2}$/.test(card.expiry)) {
        newErrors.expiry = 'Please enter a valid expiry date (MM/YY)';
      }
      if (!card.cvv || !/^\d{3,4}$/.test(card.cvv)) {
        newErrors.cvv = 'Please enter a valid CVV';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    if (errors.phone) {
      setErrors({ ...errors, phone: null });
    }
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (name === 'expiry') {
      formattedValue = formatExpiry(value);
    }

    setCard({ ...card, [name]: formattedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);
    let url = '';
    let payload = {};

    if (method === 'mpesa' || method === 'airtel') {
      url = '/api/pay';
      payload = { 
        amount, 
        phone, 
        network: method === 'mpesa' ? 'mpesa' : 'airtel', 
        email 
      };
    } else {
      url = '/api/card-pay';
      payload = { amount, ...card };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.success) {
        if (method === 'mpesa') {
          setMessage({ 
            type: 'success', 
            text: data.message || 'Please check your phone for the M-Pesa prompt to complete the payment.' 
          });
        } else {
          setMessage({ type: 'success', text: 'Payment successful! Thank you.' });
          // Reset form on success
          setAmount('');
          setPhone('');
          setEmail('');
          setCard({ number: '', expiry: '', cvv: '', email: '' });
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Payment failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Payment failed. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-6"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Flutterwave Payment</h1>
        
        <div>
          <label className="block mb-1 font-medium">Payment Method</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            {paymentMethods.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Amount (KES)</label>
          <input
            type="number"
            className={`w-full border rounded px-3 py-2 ${errors.amount ? 'border-red-500' : ''}`}
            value={amount}
            onChange={e => {
              setAmount(e.target.value);
              if (errors.amount) setErrors({ ...errors, amount: null });
            }}
            required
            min="1"
            placeholder="Enter amount"
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className={`w-full border rounded px-3 py-2 ${errors.email ? 'border-red-500' : ''}`}
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            required
            placeholder="your@email.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {(method === 'mpesa' || method === 'airtel') && (
          <div>
            <label className="block mb-1 font-medium">Phone Number</label>
            <input
              type="tel"
              className={`w-full border rounded px-3 py-2 ${errors.phone ? 'border-red-500' : ''}`}
              value={phone}
              onChange={handlePhoneChange}
              required
              placeholder="e.g., 0712345678"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>
        )}

        {method === 'card' && (
          <>
            <div>
              <label className="block mb-1 font-medium">Card Number</label>
              <input
                type="text"
                name="number"
                className={`w-full border rounded px-3 py-2 ${errors.cardNumber ? 'border-red-500' : ''}`}
                value={card.number}
                onChange={handleCardChange}
                required
                placeholder="1234 5678 9012 3456"
                maxLength="19"
              />
              {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
            </div>

            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block mb-1 font-medium">Expiry (MM/YY)</label>
                <input
                  type="text"
                  name="expiry"
                  className={`w-full border rounded px-3 py-2 ${errors.expiry ? 'border-red-500' : ''}`}
                  value={card.expiry}
                  onChange={handleCardChange}
                  required
                  placeholder="MM/YY"
                  maxLength="5"
                />
                {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
              </div>

              <div className="flex-1">
                <label className="block mb-1 font-medium">CVV</label>
                <input
                  type="text"
                  name="cvv"
                  className={`w-full border rounded px-3 py-2 ${errors.cvv ? 'border-red-500' : ''}`}
                  value={card.cvv}
                  onChange={handleCardChange}
                  required
                  placeholder="123"
                  maxLength="4"
                />
                {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          className={`w-full py-2 rounded transition ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Pay'
          )}
        </button>

        {message && (
          <div
            className={`mt-4 p-3 rounded text-center font-medium ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
