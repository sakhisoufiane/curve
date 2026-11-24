import { getToken } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.error ? JSON.stringify(data.error) : "Request failed";
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/auth/me"),

  getClients: () => request("/api/clients"),
  createClient: (payload) => request("/api/clients", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (id, payload) => request(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteClient: (id) => request(`/api/clients/${id}`, { method: "DELETE" }),
  getClientLogs: (id) => request(`/api/clients/${id}/logs`),
  getUsers: () => request("/api/users"),
  createUser: (payload) => request("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
  getUserLogs: (id) => request(`/api/users/${id}/logs`),
  getCustomers: () => request("/api/customers"),
  createCustomer: (payload) => request("/api/customers", { method: "POST", body: JSON.stringify(payload) }),
  updateCustomer: (id, payload) => request(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCustomer: (id) => request(`/api/customers/${id}`, { method: "DELETE" }),
  getCustomerLogs: (id) => request(`/api/customers/${id}/logs`),
  getProducts: (customerId) => request(`/api/products?customerId=${encodeURIComponent(customerId)}`),
  getClientProducts: (clientId) => request(`/api/products?clientId=${encodeURIComponent(clientId)}`),
  createProduct: (payload) => request("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  getProductInvolvements: (productId) => request(`/api/product-involvements?productId=${encodeURIComponent(productId)}`),
  getPersonInvolvements: (personId) => request(`/api/product-involvements?personId=${encodeURIComponent(personId)}`),
  createProductInvolvement: (payload) => request("/api/product-involvements", { method: "POST", body: JSON.stringify(payload) }),
  deleteProductInvolvement: (id) => request(`/api/product-involvements/${id}`, { method: "DELETE" }),
  updateProductInvolvement: (id, payload) => request(`/api/product-involvements/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  getPeople: () => request("/api/people"),
  createPerson: (payload) => request("/api/people", { method: "POST", body: JSON.stringify(payload) }),
  updatePerson: (id, payload) => request(`/api/people/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePerson: (id) => request(`/api/people/${id}`, { method: "DELETE" }),
  getPersonLogs: (id) => request(`/api/people/${id}/logs`),
  logActivity: (payload) => request("/api/activity", { method: "POST", body: JSON.stringify(payload) })
};
