import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-lojas-ajuda',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lojas-ajuda.component.html',
  styleUrls: ['./lojas-ajuda.component.css']
})
export class LojasAjudaComponent {}
