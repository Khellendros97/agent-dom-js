import { createApp } from 'vue';
import { Quasar } from 'quasar';

// Import Quasar CSS (pre-built, no SASS dependency needed)
import 'quasar/dist/quasar.css';

// Import icon library (Material Icons)
import '@quasar/extras/material-icons/material-icons.css';

import App from './App.vue';

const app = createApp(App);

app.use(Quasar, {
  plugins: {}, // no extra plugins needed
  config: {
    brand: {
      primary: '#1976D2',
      secondary: '#26A69A',
      accent: '#9C27B0',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#31CCEC',
      warning: '#F2C037',
    },
  },
});

app.mount('#root');
