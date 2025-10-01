<script setup lang="ts">
import { computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  data: any;
  options?: any;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
});

// Reactive chart data and options
const chartData = computed(() => props.data);
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'hsl(var(--b1))',
      titleColor: 'hsl(var(--bc))',
      bodyColor: 'hsl(var(--bc))',
      borderColor: 'hsl(var(--bc))',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)',
      },
      ticks: {
        color: '#666666',
      },
      title: {
        color: '#374151',
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)',
      },
      ticks: {
        color: '#666666',
      },
      title: {
        color: '#374151',
      },
    },
  },
  ...props.options,
}));
</script>

<template>
  <div :style="{ height: `${height}px` }" class="relative">
    <Line
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>