import { BookOpen, Target, RotateCcw, ImagePlus, Eye, Zap, ArrowRight, RefreshCw, Volume2, Boxes, BookText, BookMarked, Sparkles } from 'lucide-vue-next';

export const modes = [
  {
    name: 'Goal-Driven Learning',
    route: { name: 'practice-mode-goal-driven-learning' },
    icon: Sparkles,
    description: 'AI designs personalized exercises based on your learning goal'
  },
  {
    name: 'Fact Card Grind',
    route: { name: 'practice-mode-fact-card-grind' },
    icon: BookOpen,
    description: 'Focus exclusively on practicing fact cards'
  },
  {
    name: 'Goal Getter',
    route: { name: 'practice-mode-goal-getter' },
    icon: Target,
    description: 'Work on your goals with targeted tasks'
  },
  {
    name: 'Sisyphos',
    route: { name: 'practice-mode-sisyphos' },
    icon: RotateCcw,
    description: 'Endless review of seen content - roll that boulder!'
  },
  {
    name: 'Cram',
    route: { name: 'practice-mode-cram' },
    icon: BookMarked,
    description: 'Intensive review session for due content'
  },
  {
    name: 'Insert Images',
    route: { name: 'practice-mode-insert-images' },
    icon: ImagePlus,
    description: 'Add visual mnemonics to your vocabulary'
  },
  {
    name: 'Eyes and Ears',
    route: { name: 'practice-mode-eyes-and-ears' },
    icon: Eye,
    description: 'Match sounds to images for vocab with audio and visuals'
  },
  {
    name: 'Illegal Immersion',
    route: { name: 'practice-mode-illegal-immersion' },
    icon: Zap,
    description: 'Drill all the vocab for a piece of immersion content, then check if you understand it'
  },
  {
    name: 'Sentence Slide',
    route: { name: 'practice-mode-sentence-slide' },
    icon: ArrowRight,
    description: 'Work through connected vocab for sentences, then guess their meaning'
  },
  {
    name: 'Resource Rotation',
    route: { name: 'practice-mode-resource-rotation' },
    icon: RefreshCw,
    description: 'Extract knowledge from resources that need processing'
  },
  {
    name: 'Minimal Pairs',
    route: { name: 'practice-mode-minimal-pairs' },
    test: { name: 'test-mode-minimal-pairs' },
    icon: Volume2,
    description: 'Distinguish similar-sounding characters by listening and choosing'
  },
  {
    name: 'Component Clusters',
    route: { name: 'practice-mode-component-clusters' },
    icon: Boxes,
    description: 'Practice component vocab, then all vocab containing them'
  },
  {
    name: 'Consume Resource',
    test: { name: 'test-mode-consume-resource' },
    icon: BookText,
    description: 'Watch or read immersion content and test your understanding'
  }
];