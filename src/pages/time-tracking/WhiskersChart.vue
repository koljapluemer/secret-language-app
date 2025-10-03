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
import { Chart } from 'vue-chartjs';
import type { ChartOptions, ChartDataCustomTypesPerDataset } from 'chart.js';
import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BoxPlotController,
  BoxAndWiskers
);

interface Props {
  data: ChartDataCustomTypesPerDataset<'boxplot'>;
  options?: ChartOptions<'boxplot'>;
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
      display: true,
      position: 'top' as const,
      labels: {
        color: 'hsl(var(--bc))',
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: 'hsl(var(--b1))',
      titleColor: 'hsl(var(--bc))',
      bodyColor: 'hsl(var(--bc))',
      borderColor: 'hsl(var(--b3))',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
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
    <Chart
      type="boxplot"
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>