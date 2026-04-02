import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import {
  AdminCommunityComment,
  AdminCommunityPost,
  AdminEventoPendiente,
  AdminService,
  AdminUsuario
} from '../services/admin.service';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  loading = signal(true);
  eventosPendientes = signal<AdminEventoPendiente[]>([]);
  usuarios = signal<AdminUsuario[]>([]);
  posts = signal<AdminCommunityPost[]>([]);
  comentarios = signal<AdminCommunityComment[]>([]);

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.loading.set(true);

    forkJoin({
      eventos: this.adminService.listarEventosPendientes(),
      usuarios: this.adminService.listarUsuarios(),
      posts: this.adminService.listarPosts(),
      comentarios: this.adminService.listarComentarios()
    }).subscribe({
      next: ({ eventos, usuarios, posts, comentarios }) => {
        this.eventosPendientes.set(eventos);
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

  aprobarEvento(idEvento: number): void {
    this.adminService.aprobarEvento(idEvento).subscribe({
      next: () => {
        this.eventosPendientes.set(
          this.eventosPendientes().filter(evento => evento.idEvento !== idEvento)
        );
        this.toast.show('Evento aprobado.', 'success');
      },
      error: () => this.toast.show('No se pudo aprobar el evento.', 'error')
    });
  }

  rechazarEvento(idEvento: number): void {
    const motivo = window.prompt('Motivo del rechazo (opcional):') ?? '';

    this.adminService.rechazarEvento(idEvento, motivo).subscribe({
      next: () => {
        this.eventosPendientes.set(
          this.eventosPendientes().filter(evento => evento.idEvento !== idEvento)
        );
        this.toast.show('Evento rechazado.', 'success');
      },
      error: () => this.toast.show('No se pudo rechazar el evento.', 'error')
    });
  }

  suspenderUsuario(idUsuario: number): void {
    this.adminService.suspenderUsuario(idUsuario).subscribe({
      next: (usuario) => {
        this.actualizarUsuarioEnLista(usuario);
        this.toast.show('Usuario suspendido.', 'success');
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

  eliminarUsuario(idUsuario: number): void {
    const confirmado = window.confirm('¿Seguro que quieres eliminar este usuario definitivamente?');
    if (!confirmado) return;

    this.adminService.eliminarUsuario(idUsuario).subscribe({
      next: () => {
        this.usuarios.set(
          this.usuarios().filter(item => item.idUsuario !== idUsuario)
        );
        this.toast.show('Usuario eliminado definitivamente.', 'success');
      },
      error: (error) =>
        this.toast.show(
          error?.error?.message || error?.error?.error || 'No se pudo eliminar el usuario.',
          'error'
        )
    });
  }

  eliminarPost(idPost: number): void {
    const confirmado = window.confirm('¿Eliminar esta discusión?');
    if (!confirmado) return;

    this.adminService.eliminarPost(idPost).subscribe({
      next: () => {
        this.posts.set(this.posts().filter(post => post.idPost !== idPost));
        this.comentarios.set(this.comentarios().filter(comment => comment.postId !== idPost));
        this.toast.show('Discusión eliminada.', 'success');
      },
      error: () => this.toast.show('No se pudo eliminar la discusión.', 'error')
    });
  }

  eliminarComentario(idComment: number): void {
    const confirmado = window.confirm('¿Eliminar este comentario?');
    if (!confirmado) return;

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

  autorNombre(item: { usuario?: { nombre?: string | null; correo?: string | null } } | null | undefined): string {
    return item?.usuario?.nombre || item?.usuario?.correo || 'Usuario';
  }

  private actualizarUsuarioEnLista(usuario: AdminUsuario): void {
    this.usuarios.set(
      this.usuarios().map(item => item.idUsuario === usuario.idUsuario ? usuario : item)
    );
  }
}