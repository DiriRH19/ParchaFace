export interface Notificacion {
  id_notificacion: number;
  mensaje: string;
  fechaEnvio: string;
  leido: boolean;
  usuario?: any;
}