import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function MerchantDashboard({ merchant, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: "",
    title: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    max_discount: 100,
    min_purchase: 0,
    radius_km: 2,
    min_rides_required: 0,
    min_fare_spent: 0,
    usage_limit: null,
    valid_days: 30
  });

  useEffect(() => {
    fetchMerchantData();
    const interval = setInterval(fetchMerchantData, 10000);
    return () => clearInterval(interval);
  }, [merchant.id]);

  const fetchMerchantData = async () => {
    try {
      const [couponsRes, analyticsRes, redemptionsRes] = await Promise.all([
        axios.get(`${API_URL}/merchant-coupons/${merchant.id}`),
        axios.get(`${API_URL}/merchant-analytics/${merchant.id}`),
        axios.get(`${API_URL}/merchant-redemptions/${merchant.id}`)
      ]);
      setCoupons(couponsRes.data);
      setAnalytics(analyticsRes.data);
      setRedemptions(redemptionsRes.data);
    } catch (error) {
      console.error("Error fetching merchant data:", error);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(couponForm.valid_days));

      await axios.post(`${API_URL}/create-merchant-coupon`, {
        merchant_id: merchant.id,
        code: couponForm.code.toUpperCase(),
        title: couponForm.title,
        description: couponForm.description,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
        min_purchase: parseFloat(couponForm.min_purchase),
        radius_km: parseFloat(couponForm.radius_km),
        min_rides_required: parseInt(couponForm.min_rides_required),
        min_fare_spent: parseFloat(couponForm.min_fare_spent),
        usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit) : null,
        valid_until: validUntil.toISOString()
      });

      alert("✅ Coupon created successfully!");
      setCouponForm({
        code: "",
        title: "",
        description: "",
        discount_type: "percentage",
        discount_value: 10,
        max_discount: 100,
        min_purchase: 0,
        radius_km: 2,
        min_rides_required: 0,
        min_fare_spent: 0,
        usage_limit: null,
        valid_days: 30
      });
      fetchMerchantData();
    } catch (error) {
      alert("❌ " + (error.response?.data?.error || "Failed to create coupon"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCoupon = async (couponId, currentStatus) => {
    try {
      await axios.post(`${API_URL}/toggle-merchant-coupon/${couponId}`, {
        is_active: !currentStatus
      });
      fetchMerchantData();
    } catch (error) {
      alert("❌ Failed to update coupon");
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await axios.delete(`${API_URL}/delete-merchant-coupon/${couponId}`);
      alert("✅ Coupon deleted");
      fetchMerchantData();
    } catch (error) {
      alert("❌ Failed to delete coupon");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">🏪 {merchant.name}</h1>
            <p className="text-gray-600">{merchant.business_type} • {merchant.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          {["overview", "coupons", "create", "redemptions", "customers"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-purple-50"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "overview" && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-4xl mb-2">🎟️</div>
              <div className="text-3xl font-bold text-purple-600">{analytics.total_coupons}</div>
              <div className="text-gray-600">Total Coupons</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-3xl font-bold text-green-600">{analytics.active_coupons}</div>
              <div className="text-gray-600">Active Coupons</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-4xl mb-2">🎁</div>
              <div className="text-3xl font-bold text-blue-600">{analytics.total_redemptions}</div>
              <div className="text-gray-600">Total Redemptions</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-3xl font-bold text-orange-600">{analytics.unique_customers}</div>
              <div className="text-gray-600">Unique Customers</div>
            </div>

            {/* Top Performing Coupons */}
            <div className="bg-white rounded-2xl shadow-lg p-6 col-span-full">
              <h2 className="text-2xl font-bold text-purple-600 mb-4">📊 Top Performing Coupons</h2>
              <div className="space-y-3">
                {analytics.top_coupons?.map((coupon, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-bold text-lg">{coupon.code}</div>
                      <div className="text-gray-600">{coupon.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">{coupon.redemptions}</div>
                      <div className="text-sm text-gray-600">redemptions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg p-6 col-span-full">
              <h2 className="text-2xl font-bold text-purple-600 mb-4">⏱️ Recent Activity</h2>
              <div className="space-y-2">
                {analytics.recent_activity?.map((activity, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border-b">
                    <div>
                      <span className="font-semibold">{activity.user_name}</span> redeemed{" "}
                      <span className="font-semibold text-purple-600">{activity.coupon_code}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(activity.redeemed_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "coupons" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-purple-600 mb-6">🎟️ Manage Coupons</h2>
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`p-6 rounded-xl border-2 ${
                    coupon.is_active ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-purple-600">{coupon.code}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            coupon.is_active
                              ? "bg-green-200 text-green-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {coupon.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-xl font-semibold mb-2">{coupon.title}</div>
                      <div className="text-gray-600 mb-3">{coupon.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                        className={`px-4 py-2 rounded-lg font-semibold ${
                          coupon.is_active
                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                      >
                        {coupon.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Discount</div>
                      <div className="font-bold">
                        {coupon.discount_type === "percentage"
                          ? `${coupon.discount_value}%`
                          : `₹${coupon.discount_value}`}
                        {coupon.max_discount && ` (max ₹${coupon.max_discount})`}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Min Purchase</div>
                      <div className="font-bold">₹{coupon.min_purchase}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Radius</div>
                      <div className="font-bold">{coupon.radius_km} km</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Usage</div>
                      <div className="font-bold">
                        {coupon.usage_count} / {coupon.usage_limit || "∞"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Min Rides</div>
                      <div className="font-bold">{coupon.min_rides_required}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Min Spent</div>
                      <div className="font-bold">₹{coupon.min_fare_spent}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Valid Until</div>
                      <div className="font-bold">
                        {new Date(coupon.valid_until).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Created</div>
                      <div className="font-bold">
                        {new Date(coupon.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No coupons yet. Create your first coupon!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "create" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-purple-600 mb-6">➕ Create New Coupon</h2>
            <form onSubmit={handleCreateCoupon} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., SAVE20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={couponForm.title}
                    onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 20% Off on All Items"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    rows="3"
                    placeholder="e.g., Get 20% off on your next purchase at our store"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponForm.max_discount}
                    onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Purchase (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={couponForm.min_purchase}
                    onChange={(e) => setCouponForm({ ...couponForm, min_purchase: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Radius (km) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={couponForm.radius_km}
                    onChange={(e) => setCouponForm({ ...couponForm, radius_km: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Rides Required *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={couponForm.min_rides_required}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, min_rides_required: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Fare Spent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={couponForm.min_fare_spent}
                    onChange={(e) => setCouponForm({ ...couponForm, min_fare_spent: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.usage_limit || ""}
                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 100 (leave empty for unlimited)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid For (days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={couponForm.valid_days}
                    onChange={(e) => setCouponForm({ ...couponForm, valid_days: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
                    placeholder="e.g., 30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 disabled:bg-gray-400"
              >
                {loading ? "Creating..." : "Create Coupon"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "redemptions" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-purple-600 mb-6">🎁 Redemption History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-purple-200">
                    <th className="text-left py-3 px-4 text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 text-gray-700">Coupon</th>
                    <th className="text-left py-3 px-4 text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-gray-700">Ride ID</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((redemption, idx) => (
                    <tr key={idx} className="border-b hover:bg-purple-50">
                      <td className="py-3 px-4 text-gray-800">
                        {new Date(redemption.redeemed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{redemption.customer_name}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-purple-600">{redemption.coupon_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          redemption.customer_type === 'user' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {redemption.customer_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">#{redemption.ride_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {redemptions.length === 0 && (
                <div className="text-center py-12 text-gray-500">No redemptions yet</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-purple-600 mb-6">👥 Customer Insights</h2>
            {analytics?.customer_stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {analytics.customer_stats.total_users}
                    </div>
                    <div className="text-gray-700 font-medium">Total Users</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.customer_stats.total_drivers}
                    </div>
                    <div className="text-gray-700 font-medium">Total Drivers</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {analytics.customer_stats.repeat_customers}
                    </div>
                    <div className="text-gray-700 font-medium">Repeat Customers</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Top Customers</h3>
                  <div className="space-y-2">
                    {analytics.customer_stats.top_customers?.map((customer, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">
                            {customer.redemption_count}
                          </div>
                          <div className="text-sm text-gray-600">redemptions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
