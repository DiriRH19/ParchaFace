export const API_CONFIG = {
  baseUrl: '', // Vacío para usar proxy en desarrollo, cambiar a 'http://localhost:8080' en producción
  endpoints: {
    auth: {
      login: '/auth/signin',
      register: '/auth/register'
    }
  }
};

