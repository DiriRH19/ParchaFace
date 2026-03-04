export const API_CONFIG = {
  baseUrl: '',
  endpoints: {
    auth: {
      login: '/auth/signin',
      register: '/auth/register',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      verifyResetCode: '/auth/verify-reset-code'
    },
    usuarios: {
      base: '/usuarios',                 // GET /usuarios, POST /usuarios
      byId: (id: number) => `/usuarios/${id}`,
      fotoPerfil: (id: number) => `/usuarios/${id}/foto-perfil`,
      fotoPortada: (id: number) => `/usuarios/${id}/foto-portada`
    },
    eventos: {
      base: '/eventos',
      byId: (id: number) => `/eventos/${id}`,
      public: '/eventos/public'
    },
    preferencias: {
      get: '/api/preferencias',
      put: '/api/preferencias'
    },
    comentarios: {
      getByEvento: (idEvento: number) => `/api/eventos/${idEvento}/comentarios`,
      put: (idComentario: number) => `/api/comentarios/${idComentario}`,
      del: (idComentario: number) => `/api/comentarios/${idComentario}`
    },
    uploads: {
      base: '/uploads'
    }
  }
};
