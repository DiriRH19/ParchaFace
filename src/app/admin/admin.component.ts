import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import {
  AdminCommunityComment,
  AdminCommunityPost,
  AdminEvento,
  AdminService,
  AdminUsuario
} from '../services/admin.service';
import { ToastService } from '../shared/toast/toast.service';
import { ParchaSwal } from '../shared/swal/parcha-swal';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  loading = signal(true);
  eventosPendientes = signal<AdminEvento[]>([]);
  eventos = signal<AdminEvento[]>([]);
  usuarios = signal<AdminUsuario[]>([]);
  posts = signal<AdminCommunityPost[]>([]);
  comentarios = signal<AdminCommunityComment[]>([]);

  private readonly suspensionOptions: Record<string, string> = {
    INDEFINIDA: 'Indefinida',
    '1_SEMANA': '1 semana',
    '2_SEMANAS': '2 semanas',
    '1_MES': '1 mes',
    '3_MESES': '3 meses'
  };

  constructor(
    private adminService: AdminService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.loading.set(true);

    forkJoin({
      pendientes: this.adminService.listarEventosPendientes(),
      eventos: this.adminService.listarEventos(),
      usuarios: this.adminService.listarUsuarios(),
      posts: this.adminService.listarPosts(),
      comentarios: this.adminService.listarComentarios()
    }).subscribe({
      next: ({ pendientes, eventos, usuarios, posts, comentarios }) => {
        this.eventosPendientes.set(pendientes);
        this.eventos.set(eventos);
        this.usuarios.set(usuarios);
        this.posts.set(posts);
        this.comentarios.set(comentarios);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('No se pudo cargar el panel administrador.', 'error');
        this.loading.set(false);
      }
    });
  }

  verEvento(idEvento: number): void {
    console.log('click evento', idEvento);
    this.router.navigate(['/event', idEvento]);
  }

  aprobarEvento(idEvento: number, event?: Event): void {
    event?.stopPropagation();

    this.adminService.aprobarEvento(idEvento).subscribe({
      next: () => {
        this.eventosPendientes.set(
          this.eventosPendientes().filter(item => item.idEvento !== idEvento)
        );
        this.toast.show('Evento aprobado.', 'success');
      },
      error: () => this.toast.show('No se pudo aprobar el evento.', 'error')
    });
  }

  async rechazarEvento(idEvento: number, event?: Event): Promise<void> {
    event?.stopPropagation();

    const { isConfirmed, value } = await ParchaSwal.fire({
      title: 'Rechazar evento',
      text: 'Puedes escribir un motivo opcional para el rechazo.',
      input: 'textarea',
      inputPlaceholder: 'Escribe el motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    const motivo = String(value ?? '').trim();

    this.adminService.rechazarEvento(idEvento, motivo).subscribe({
      next: () => {
        this.eventosPendientes.set(
          this.eventosPendientes().filter(item => item.idEvento !== idEvento)
        );
        this.toast.show('Evento rechazado.', 'success');
      },
      error: () => this.toast.show('No se pudo rechazar el evento.', 'error')
    });
  }

  async eliminarEvento(idEvento: number, event?: Event): Promise<void> {
    event?.stopPropagation();

    const { isConfirmed } = await ParchaSwal.fire({
      icon: 'warning',
      title: '¿Eliminar evento?',
      text: 'Esta acción eliminará el evento y no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    this.adminService.eliminarEvento(idEvento).subscribe({
      next: () => {
        this.eventos.set(this.eventos().filter(item => item.idEvento !== idEvento));
        this.eventosPendientes.set(this.eventosPendientes().filter(item => item.idEvento !== idEvento));
        this.toast.show('Evento eliminado.', 'success');
      },
      error: (error) =>
        this.toast.show(
          error?.error?.message || error?.error?.error || 'No se pudo eliminar el evento.',
          'error'
        )
    });
  }

  async suspenderUsuario(idUsuario: number): Promise<void> {
    const { isConfirmed, value } = await ParchaSwal.fire({
      title: 'Suspender usuario',
      text: 'Selecciona por cuánto tiempo quieres suspender esta cuenta.',
      input: 'select',
      inputOptions: this.suspensionOptions,
      inputValue: '1_SEMANA',
      showCancelButton: true,
      confirmButtonText: 'Suspender',
      cancelButtonText: 'Cancelar',
      inputPlaceholder: 'Selecciona una duración'
    });

    if (!isConfirmed || !value) return;

    this.adminService.suspenderUsuario(idUsuario, { duracion: String(value) }).subscribe({
      next: (usuario) => {
        this.actualizarUsuarioEnLista(usuario);
        const etiqueta = this.suspensionOptions[String(value)] || 'la duración seleccionada';
        this.toast.show(`Usuario suspendido por ${etiqueta.toLowerCase()}.`, 'success');
      },
      error: (error) =>
        this.toast.show(
          error?.error?.message || error?.error?.error || 'No se pudo suspender el usuario.',
          'error'
        )
    });
  }

  activarUsuario(idUsuario: number): void {
    this.adminService.activarUsuario(idUsuario).subscribe({
      next: (usuario) => {
        this.actualizarUsuarioEnLista(usuario);
        this.toast.show('Usuario activado.', 'success');
      },
      error: () => this.toast.show('No se pudo activar el usuario.', 'error')
    });
  }

  async eliminarUsuario(idUsuario: number): Promise<void> {
    const { isConfirmed } = await ParchaSwal.fire({
      icon: 'warning',
      title: '¿Eliminar usuario?',
      text: 'Esta acción eliminará definitivamente la cuenta.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    this.adminService.eliminarUsuario(idUsuario).subscribe({
      next: () => {
        this.usuarios.set(this.usuarios().filter(item => item.idUsuario !== idUsuario));
        this.toast.show('Usuario eliminado definitivamente.', 'success');
      },
      error: (error) =>
        this.toast.show(
          error?.error?.message || error?.error?.error || 'No se pudo eliminar el usuario.',
          'error'
        )
    });
  }

  async eliminarPost(idPost: number): Promise<void> {
    const { isConfirmed } = await ParchaSwal.fire({
      icon: 'warning',
      title: '¿Eliminar discusión?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    this.adminService.eliminarPost(idPost).subscribe({
      next: () => {
        this.posts.set(this.posts().filter(post => post.idPost !== idPost));
        this.comentarios.set(this.comentarios().filter(comment => comment.postId !== idPost));
        this.toast.show('Discusión eliminada.', 'success');
      },
      error: () => this.toast.show('No se pudo eliminar la discusión.', 'error')
    });
  }

  async eliminarComentario(idComment: number): Promise<void> {
    const { isConfirmed } = await ParchaSwal.fire({
      icon: 'warning',
      title: '¿Eliminar comentario?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    this.adminService.eliminarComentario(idComment).subscribe({
      next: () => {
        this.comentarios.set(this.comentarios().filter(comment => comment.idComment !== idComment));
        this.toast.show('Comentario eliminado.', 'success');
      },
      error: () => this.toast.show('No se pudo eliminar el comentario.', 'error')
    });
  }

  badgeEstado(estado?: string | null): string {
    return (estado || 'SIN_ESTADO').replaceAll('_', ' ');
  }

  formatSuspensionHasta(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  autorNombre(item: { usuario?: { nombre?: string | null; correo?: string | null } } | null | undefined): string {
    return item?.usuario?.nombre || item?.usuario?.correo || 'Usuario';
  }

  private actualizarUsuarioEnLista(usuario: AdminUsuario): void {
    this.usuarios.set(
      this.usuarios().map(item => item.idUsuario === usuario.idUsuario ? usuario : item)
    );
  }
}