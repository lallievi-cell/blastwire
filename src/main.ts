import './styles/tokens.css';
import './styles/layout.css';
import './styles/board.css';
import './styles/components.css';
import { GameController } from './ui/GameController';

window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
