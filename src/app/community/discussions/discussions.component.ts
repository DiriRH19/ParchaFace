import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityPost, CommunityService, SortKey } from '../../services/community.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-discussions',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './discussions.component.html',
  styleUrls: ['./discussions.component.css'],
})
export class DiscussionsComponent implements OnInit {
  q = signal('');
  city = signal('Todas');
  category = signal('Todas');
  sort = signal<SortKey>('recent');

  cities = signal(['Todas', 'Ciudad de México', 'Guadalajara', 'Monterrey', 'Bogotá', 'Medellín']);
  categories = signal(['Todas', 'Música', 'Tech', 'Networking', 'Deportes', 'Arte', 'Gaming']);

  loading = signal(false);
  posts = signal<CommunityPost[]>([]);

  constructor(private community: CommunityService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.community.getPosts({
      q: this.q(),
      city: this.city(),
      category: this.category(),
      sort: this.sort(),
    }).subscribe(list => {
      this.posts.set(list);
      this.loading.set(false);
    });
  }

  back() {
    this.router.navigateByUrl('/community');
  }

  setSort(v: SortKey) {
    this.sort.set(v);
    this.load();
  }

  openPost(id: string) {
    console.log('openPost() id:', id);
    this.router.navigate(['/community/discussions', id]);
  }

  goCreate() {
    this.router.navigate(['/community/create-post']);
  }
}
