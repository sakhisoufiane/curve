import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const queryKeys = {
  clients: ["clients"],
  clientLogs: (clientId) => ["clients", clientId, "logs"],
  clientProducts: (clientId) => ["clients", clientId, "products"],
  customers: ["customers"],
  customerLogs: (customerId) => ["customers", customerId, "logs"],
  products: (customerId) => ["customers", customerId, "products"],
  productInvolvements: (productId) => ["products", productId, "involvements"],
  personInvolvements: (personId) => ["people", personId, "involvements"],
  users: ["users"],
  userLogs: (userId) => ["users", userId, "logs"],
  people: ["people"],
  personLogs: (personId) => ["people", personId, "logs"]
};

export function useCustomers() {
  return useQuery({ queryKey: queryKeys.customers, queryFn: api.getCustomers });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers })
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateCustomer(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers })
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers })
  });
}

export function useCustomerLogs(customerId) {
  return useQuery({
    queryKey: queryKeys.customerLogs(customerId),
    queryFn: () => api.getCustomerLogs(customerId),
    enabled: !!customerId && customerId !== "new"
  });
}

export function useProducts(customerId) {
  return useQuery({
    queryKey: queryKeys.products(customerId),
    queryFn: () => api.getProducts(customerId),
    enabled: !!customerId && customerId !== "new"
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProduct,
    onSuccess: (_data, variables) => {
      if (variables?.customerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products(variables.customerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.customerLogs(variables.customerId) });
      }
      if (variables?.clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.clientProducts(variables.clientId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.clientLogs(variables.clientId) });
      }
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateProduct(id, payload),
    onSuccess: (_data, variables) => {
      if (variables?.payload?.customerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products(variables.payload.customerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.customerLogs(variables.payload.customerId) });
      }
      if (variables?.payload?.clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.clientProducts(variables.payload.clientId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.clientLogs(variables.payload.clientId) });
      }
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api.deleteProduct(id),
    onSuccess: (_data, variables) => {
      if (variables?.customerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products(variables.customerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.customerLogs(variables.customerId) });
      }
      if (variables?.clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.clientProducts(variables.clientId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.clientLogs(variables.clientId) });
      }
    }
  });
}

export function useClientProducts(clientId) {
  return useQuery({
    queryKey: queryKeys.clientProducts(clientId),
    queryFn: () => api.getClientProducts(clientId),
    enabled: !!clientId
  });
}

export function useProductInvolvements(productId) {
  return useQuery({
    queryKey: queryKeys.productInvolvements(productId),
    queryFn: () => api.getProductInvolvements(productId),
    enabled: !!productId
  });
}

export function usePersonInvolvements(personId) {
  return useQuery({
    queryKey: queryKeys.personInvolvements(personId),
    queryFn: () => api.getPersonInvolvements(personId),
    enabled: !!personId && personId !== "new"
  });
}

export function useCreateProductInvolvement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProductInvolvement,
    onSuccess: (_data, variables) => {
      if (variables?.productId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.productInvolvements(variables.productId) });
      }
    }
  });
}

export function useDeleteProductInvolvement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api.deleteProductInvolvement(id),
    onSuccess: (_data, variables) => {
      if (variables?.productId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.productInvolvements(variables.productId) });
      }
    }
  });
}

export function useUpdateProductInvolvement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateProductInvolvement(id, payload),
    onSuccess: (_data, variables) => {
      if (variables?.payload?.productId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.productInvolvements(variables.payload.productId) });
      }
      if (variables?.payload?.personId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.personInvolvements(variables.payload.personId) });
      }
    }
  });
}

export function useClients() {
  return useQuery({ queryKey: queryKeys.clients, queryFn: api.getClients });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients })
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients })
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateClient(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients })
  });
}

export function useClientLogs(clientId) {
  return useQuery({
    queryKey: queryKeys.clientLogs(clientId),
    queryFn: () => api.getClientLogs(clientId),
    enabled: !!clientId
  });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: api.getUsers });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users })
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users })
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users })
  });
}

export function useUserLogs(userId) {
  return useQuery({
    queryKey: queryKeys.userLogs(userId),
    queryFn: () => api.getUserLogs(userId),
    enabled: !!userId
  });
}

export function usePeople() {
  return useQuery({ queryKey: queryKeys.people, queryFn: api.getPeople });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createPerson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.people })
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updatePerson(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.people })
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePerson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.people })
  });
}

export function usePersonLogs(personId) {
  return useQuery({
    queryKey: queryKeys.personLogs(personId),
    queryFn: () => api.getPersonLogs(personId),
    enabled: !!personId && personId !== "new"
  });
}
