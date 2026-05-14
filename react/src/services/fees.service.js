import { api } from '../api/client.js';

export async function getFeeStructures() {
  const { data } = await api.get('/fees/structure');
  return data || [];
}

export async function saveFeeStructure(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/fees/structure/${values.id}`, values)
      : await api.post('/fees/structure', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function getInvoices(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/fees/invoices?${qs}`);
  return { items: data || [], meta };
}

export async function getInvoiceById(id) {
  const { data } = await api.get(`/fees/invoices/${id}`);
  return data;
}

export async function saveInvoice(values) {
  try {
    const { data } = await api.post('/fees/invoices', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function recordPayment(values) {
  try {
    const { data } = await api.post('/fees/invoices/pay', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function waiveInvoice(invoiceId, amount) {
  try {
    const { data } = await api.post(`/fees/invoices/${invoiceId}/waive`, { amount });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function getPaymentHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/fees/payments?${qs}`);
  return { items: data || [], meta };
}