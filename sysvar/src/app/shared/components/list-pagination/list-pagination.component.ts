import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list-pagination.component.html',
  styleUrls: ['./list-pagination.component.css']
})
export class ListPaginationComponent {
  @Input() currentPage = 1;
  @Input() pageSize = 20;
  @Input() totalItems = 0;
  @Input() pageSizeOptions: number[] = [20, 50, 100];
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number { return Math.max(1, Math.ceil(this.totalItems / this.pageSize)); }
  get start(): number { return this.totalItems ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get end(): number { return Math.min(this.currentPage * this.pageSize, this.totalItems); }
}
