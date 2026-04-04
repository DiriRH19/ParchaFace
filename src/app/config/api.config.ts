import { environment } from '../../environments/environment';

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const joinUrl = (base: string, path: string): string => {
  const normalizedBase = normalizeBaseUrl(base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const BASE_URL = normalizeBaseUrl(environment.apiUrl || 'http://localhost:8080');

export const API_CONFIG = {
  baseUrl: BASE_URL,
  mediaBaseUrl: BASE_URL,
  endpoints: {
    auth: {
      login: '/auth/signin',
      register: '/auth/register',
      google: '/auth/google'
    },
    preferencias: {
      get: '/api/preferencias',
      put: '/api/preferencias'
    },
    usuarios: {
      base: '/usuarios',
      fotoPerfil: '/usuarios/:id/foto-perfil',
      eliminarFotoPerfil: '/usuarios/:id/foto-perfil',
      fotoPortada: '/usuarios/:id/foto-portada',
      byId: '/usuarios/:id',
      perfil: '/usuarios/:id/perfil',
      seguidores: '/usuarios/:id/seguidores',
      siguiendo: '/usuarios/:id/siguiendo',
      seguir: '/usuarios/:id/seguir',
      buscar: '/usuarios/buscar'
    },
    perfil: {
      base: '/perfil',
      misEventosCreados: '/perfil/mis-eventos-creados',
      misEventosInscritos: '/perfil/mis-eventos-inscritos',
      actividad: '/perfil/actividad'
    },
    comentarios: {
      listarPorEvento: '/api/eventos/:eventoId/comentarios',
      crearPorEvento: '/api/eventos/:eventoId/comentarios',
      eliminar: '/api/comentarios/:commentId'
    },
    admin: {
      eventos: '/admin/eventos',
      eliminarEvento: '/admin/eventos/:id',
      eventosPendientes: '/admin/eventos/pendientes',
      aprobarEvento: '/admin/eventos/:id/aprobar',
      rechazarEvento: '/admin/eventos/:id/rechazar',
      usuarios: '/admin/usuarios',
      suspenderUsuario: '/admin/usuarios/:id/suspender',
      activarUsuario: '/admin/usuarios/:id/activar',
      eliminarUsuario: '/admin/usuarios/:id',
      communityPosts: '/admin/community/posts',
      eliminarCommunityPost: '/admin/community/posts/:id',
      communityComments: '/admin/community/comments',
      eliminarCommunityComment: '/admin/community/comments/:id'
    }
  }
} as const;

export const buildApiUrl = (path: string): string => joinUrl(API_CONFIG.baseUrl, path);

export const buildMediaUrl = (path?: string | null): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return joinUrl(API_CONFIG.mediaBaseUrl, path);
};

export const withPathParam = (template: string, params: Record<string, string | number>): string => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`:${key}`, String(value));
  }, template);
};