import {FC} from 'react';
import styles from './discord-button.module.scss'

interface DiscordButtonProps {
}

const DiscordButton: FC<DiscordButtonProps> = (props) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 875 280" className={styles.discordSVG}>
            <rect className={styles.bg} width="875" height="280" rx="19"/>
            <path className={styles.fg}
                  d="M221.18 22.54H63.72a24.15 24.15 0 0 0-24.09 24.21v158.87a24.15 24.15 0 0 0 24.09 24.21H197l-6.22-21.74 15 14L220 235.23l25.27 22.33V46.75a24.15 24.15 0 0 0-24.09-24.21zM175.82 176s-4.23-5-7.75-9.52c15.39-4.35 21.27-14 21.27-14a67.65 67.65 0 0 1-13.52 6.93 77 77 0 0 1-17 5.05 82.31 82.31 0 0 1-30.43-.11 99 99 0 0 1-17.27-5.06 67.49 67.49 0 0 1-8.58-4c-.36-.24-.71-.35-1.06-.59a1.65 1.65 0 0 1-.47-.35c-2.12-1.18-3.29-2-3.29-2s5.64 9.4 20.56 13.87c-3.52 4.46-7.87 9.75-7.87 9.75-26-.82-35.84-17.86-35.84-17.86 0-37.84 16.92-68.51 16.92-68.51 16.92-12.69 33-12.34 33-12.34l1.18 1.41c-21.15 6.11-30.91 15.4-30.91 15.4s2.59-1.41 6.93-3.41c12.58-5.52 22.57-7 26.68-7.4a11.26 11.26 0 0 1 2-.24 99.15 99.15 0 0 1 23.73-.23 95.66 95.66 0 0 1 35.37 11.28s-9.28-8.82-29.26-14.93l1.65-1.88s16.1-.35 33 12.34c0 0 16.92 30.67 16.92 68.51 0 0-10 17-36 17.86zm-54.64-54.88c-6.7 0-12 5.88-12 13.05s5.4 13 12 13 12-5.88 12-13-5.29-13.05-12-13.05m42.89 0c-6.7 0-12 5.88-12 13.05s5.4 13 12 13 12-5.88 12-13-5.29-13.05-12-13.05m163.15-45.36q-.15 4.32 0 8.74a4.6 4.6 0 0 0 1.12 3.3 4 4 0 0 0 2.73.91 4.36 4.36 0 0 0 2.36-.63A3.84 3.84 0 0 0 335 85.9a2.38 2.38 0 0 1 .65-1.2 2.09 2.09 0 0 1 1.27-.31h10.58a1.1 1.1 0 0 1 .81.34 1.12 1.12 0 0 1 .33.81 11.84 11.84 0 0 1-1.56 6 12.61 12.61 0 0 1-3.95 4.14 17.48 17.48 0 0 1-5.56 2.36 28.6 28.6 0 0 1-13.31 0 15.66 15.66 0 0 1-5.44-2.52 12.11 12.11 0 0 1-3.64-4.37 15.67 15.67 0 0 1-1.48-6.39c-.07-1.43-.1-3-.1-4.58s0-3.19.1-4.68a15 15 0 0 1 1.53-6.29 12.76 12.76 0 0 1 3.7-4.4 15.51 15.51 0 0 1 5.43-2.57 25.92 25.92 0 0 1 6.76-.83 27.5 27.5 0 0 1 6.45.75 17.27 17.27 0 0 1 5.56 2.37 12.58 12.58 0 0 1 3.95 4.13 11.85 11.85 0 0 1 1.56 6.06 1.13 1.13 0 0 1-1.14 1.14h-10.61a1.94 1.94 0 0 1-1.25-.31 2.88 2.88 0 0 1-.67-1.19 3.91 3.91 0 0 0-1.56-2.24 4.61 4.61 0 0 0-2.34-.57 3.9 3.9 0 0 0-2.73.91 4.58 4.58 0 0 0-1.12 3.3zm53.14 11.91a1.38 1.38 0 0 1 1 .41 1.35 1.35 0 0 1 .42 1v7.85a1.43 1.43 0 0 1-1.41 1.41h-26.2a1.32 1.32 0 0 1-1-.42 1.35 1.35 0 0 1-.42-1V63.33a1.42 1.42 0 0 1 1.41-1.4h10.4a1.42 1.42 0 0 1 1.4 1.4v24.34zm6.35 10.66a1.43 1.43 0 0 1-1.41-1.41V63.33a1.35 1.35 0 0 1 .42-1 1.38 1.38 0 0 1 1-.41h10.61a1.42 1.42 0 0 1 1.4 1.4v33.6a1.35 1.35 0 0 1-.42 1 1.32 1.32 0 0 1-1 .42zM417 75.76q-.15 4.32 0 8.74a4.64 4.64 0 0 0 1.12 3.3 4 4 0 0 0 2.73.91 4.42 4.42 0 0 0 2.37-.63 3.88 3.88 0 0 0 1.53-2.18 2.38 2.38 0 0 1 .65-1.2 2.13 2.13 0 0 1 1.28-.31h10.6a1.09 1.09 0 0 1 .81.34 1.13 1.13 0 0 1 .34.81 12 12 0 0 1-1.56 6 12.82 12.82 0 0 1-3.95 4.14 17.54 17.54 0 0 1-5.57 2.36 27 27 0 0 1-6.45.76 27.29 27.29 0 0 1-6.86-.81 15.61 15.61 0 0 1-5.43-2.52 11.92 11.92 0 0 1-3.61-4.32 15.66 15.66 0 0 1-1.49-6.39c-.07-1.43-.1-3-.1-4.58s0-3.19.1-4.68a15 15 0 0 1 1.49-6.29 12.84 12.84 0 0 1 3.69-4.4 15.51 15.51 0 0 1 5.43-2.57 26 26 0 0 1 6.76-.83 27.5 27.5 0 0 1 6.45.75 17.33 17.33 0 0 1 5.57 2.37 12.78 12.78 0 0 1 3.95 4.13 12.05 12.05 0 0 1 1.56 6.06 1.14 1.14 0 0 1-.34.81 1.12 1.12 0 0 1-.81.33H426.7a1.92 1.92 0 0 1-1.25-.31 2.77 2.77 0 0 1-.68-1.19 3.91 3.91 0 0 0-1.56-2.24 4.61 4.61 0 0 0-2.34-.57 3.93 3.93 0 0 0-2.73.91 4.62 4.62 0 0 0-1.14 3.3zm59.61 20.85a1.07 1.07 0 0 1 .16.57 1.09 1.09 0 0 1-.34.81 1.1 1.1 0 0 1-.8.34h-11.86a2.17 2.17 0 0 1-1.53-.47 2.56 2.56 0 0 1-.6-.73l-6.35-11.33v11.12a1.42 1.42 0 0 1-1.4 1.41H444a1.43 1.43 0 0 1-1.41-1.41V63.33a1.35 1.35 0 0 1 .42-1 1.38 1.38 0 0 1 1-.41h9.93a1.38 1.38 0 0 1 1 .41 1.34 1.34 0 0 1 .41 1v10.3l5.88-10.56a3 3 0 0 1 .73-.78 2.17 2.17 0 0 1 1.35-.36h11.49a1.16 1.16 0 0 1 1.15 1.14.94.94 0 0 1-.16.57l-9.36 15.71zm41.6-34.68a1.38 1.38 0 0 1 1 .41 1.35 1.35 0 0 1 .42 1v8.36a1.34 1.34 0 0 1-.42 1 1.35 1.35 0 0 1-1 .42h-8.63v23.8a1.38 1.38 0 0 1-.41 1 1.35 1.35 0 0 1-1 .42h-10.4a1.43 1.43 0 0 1-1.41-1.41V73.11h-8.63a1.42 1.42 0 0 1-1.4-1.41v-8.37a1.4 1.4 0 0 1 1.4-1.4zm38.59 13.73c.07 1.49.1 3 .1 4.62s0 3.11-.1 4.53a15.22 15.22 0 0 1-1.46 6.11 12.49 12.49 0 0 1-3.56 4.39 15.46 15.46 0 0 1-5.41 2.69 27.62 27.62 0 0 1-13.91 0 15.48 15.48 0 0 1-5.38-2.65 12.49 12.49 0 0 1-3.56-4.39 15.22 15.22 0 0 1-1.46-6.11c-.07-1.42-.1-2.93-.1-4.53s0-3.13.1-4.62a15.33 15.33 0 0 1 1.46-6.09 12.86 12.86 0 0 1 3.56-4.47 15.83 15.83 0 0 1 5.38-2.76 26.47 26.47 0 0 1 13.91 0 15.8 15.8 0 0 1 5.41 2.76 12.86 12.86 0 0 1 3.56 4.47 15.33 15.33 0 0 1 1.46 6.05zm-21.22 8.84a4.67 4.67 0 0 0 1.12 3.19 4.16 4.16 0 0 0 5.46 0 4.67 4.67 0 0 0 1.12-3.19q.15-4.43 0-8.74a4.6 4.6 0 0 0-1.15-3.2 4.11 4.11 0 0 0-5.4 0 4.6 4.6 0 0 0-1.15 3.2q-.15 4.32 0 8.74zm66.77.41a13.58 13.58 0 0 1-1.35 6.22 12.29 12.29 0 0 1-3.61 4.34A15.86 15.86 0 0 1 592 98a25.73 25.73 0 0 1-6.63.83 23 23 0 0 1-6.19-.83 16.52 16.52 0 0 1-5.18-2.45 13.14 13.14 0 0 1-3.64-4 11 11 0 0 1-1.43-5.43 1.16 1.16 0 0 1 1.13-1.12h10.61a1.83 1.83 0 0 1 1.29.39 4.27 4.27 0 0 1 .84 1.28 5 5 0 0 0 1.12 1.56 2.86 2.86 0 0 0 1.89.52 2.92 2.92 0 0 0 2.24-.91 5 5 0 0 0 .83-3.3v-12h-15.44a1.38 1.38 0 0 1-1-.41 1.35 1.35 0 0 1-.42-1v-7.8a1.35 1.35 0 0 1 .42-1 1.38 1.38 0 0 1 1-.41h27.5a1.42 1.42 0 0 1 1.41 1.4zm39.21-9.25c.07 1.49.1 3 .1 4.62s0 3.11-.1 4.53a15.22 15.22 0 0 1-1.46 6.11 12.6 12.6 0 0 1-3.56 4.39 15.46 15.46 0 0 1-5.41 2.69 27.62 27.62 0 0 1-13.91 0 15.48 15.48 0 0 1-5.38-2.65 12.49 12.49 0 0 1-3.56-4.39 15.06 15.06 0 0 1-1.46-6.11c-.07-1.42-.1-2.93-.1-4.53s0-3.13.1-4.62a15.17 15.17 0 0 1 1.46-6.09 12.86 12.86 0 0 1 3.56-4.47 15.83 15.83 0 0 1 5.38-2.76 26.47 26.47 0 0 1 13.91 0 15.8 15.8 0 0 1 5.41 2.76 13 13 0 0 1 3.56 4.47 15.33 15.33 0 0 1 1.46 6.05zm-21.22 8.84a4.67 4.67 0 0 0 1.12 3.19 4.16 4.16 0 0 0 5.46 0A4.67 4.67 0 0 0 628 84.5q.15-4.43 0-8.74a4.6 4.6 0 0 0-1.15-3.2 4.11 4.11 0 0 0-5.4 0 4.6 4.6 0 0 0-1.15 3.2q-.11 4.32.04 8.74zm27.4 13.83a1.32 1.32 0 0 1-1-.42 1.35 1.35 0 0 1-.42-1V63.33a1.42 1.42 0 0 1 1.4-1.4h10.61a1.38 1.38 0 0 1 1 .41 1.35 1.35 0 0 1 .42 1v33.58a1.43 1.43 0 0 1-1.41 1.41zm49.09-36.4a1.38 1.38 0 0 1 1 .41 1.35 1.35 0 0 1 .42 1v33.58a1.43 1.43 0 0 1-1.41 1.41h-8.21a2.07 2.07 0 0 1-1.51-.47 5 5 0 0 1-.63-.73l-8.79-13.26v13a1.43 1.43 0 0 1-1.41 1.41h-9.41a1.42 1.42 0 0 1-1.4-1.41V63.33a1.34 1.34 0 0 1 .41-1 1.38 1.38 0 0 1 1-.41h8.22a2 2 0 0 1 1.5.47 4.48 4.48 0 0 1 .63.72L686 77.53v-14.2a1.34 1.34 0 0 1 .41-1 1.38 1.38 0 0 1 1-.41zm50.6 13.73c.07 1.49.1 3 .1 4.62s0 3.11-.1 4.53a15.22 15.22 0 0 1-1.43 6.11 12.6 12.6 0 0 1-3.56 4.39A15.46 15.46 0 0 1 737 98a27.62 27.62 0 0 1-13.91 0 15.48 15.48 0 0 1-5.38-2.65 12.49 12.49 0 0 1-3.56-4.39 15.22 15.22 0 0 1-1.46-6.11c-.07-1.42-.1-2.93-.1-4.53s0-3.13.1-4.62a15.33 15.33 0 0 1 1.46-6.09 12.86 12.86 0 0 1 3.56-4.47 15.83 15.83 0 0 1 5.38-2.76 26.47 26.47 0 0 1 13.91 0 15.8 15.8 0 0 1 5.41 2.76 13 13 0 0 1 3.59 4.43 15.33 15.33 0 0 1 1.43 6.09zm-21.22 8.84a4.67 4.67 0 0 0 1.12 3.19 4.16 4.16 0 0 0 5.46 0 4.67 4.67 0 0 0 1.12-3.19q.15-4.43 0-8.74a4.6 4.6 0 0 0-1.15-3.2 4.11 4.11 0 0 0-5.4 0 4.6 4.6 0 0 0-1.15 3.2q-.15 4.32 0 8.74zm57.98-22.57a1.38 1.38 0 0 1 1 .41 1.34 1.34 0 0 1 .41 1V84.6a15 15 0 0 1-1.25 6.4 12.31 12.31 0 0 1-3.46 4.45 14.57 14.57 0 0 1-5.31 2.6 26.24 26.24 0 0 1-6.78.83 26.84 26.84 0 0 1-6.87-.83 14.58 14.58 0 0 1-5.33-2.6 12.18 12.18 0 0 1-3.45-4.45 14.87 14.87 0 0 1-1.25-6.37v-21.3a1.4 1.4 0 0 1 1.4-1.4h10.19a1.42 1.42 0 0 1 1.41 1.4v21.06q0 4 3.85 4t3.84-4V63.33a1.35 1.35 0 0 1 .42-1 1.38 1.38 0 0 1 1-.41zm40.3 34.68a1.37 1.37 0 0 1 .16.57 1.13 1.13 0 0 1-.34.81 1.14 1.14 0 0 1-.81.34h-10.66a2.16 2.16 0 0 1-1.56-.52 3.1 3.1 0 0 1-.67-.89L806.13 87H804v9.93a1.38 1.38 0 0 1-.41 1 1.35 1.35 0 0 1-1 .42h-10.18a1.34 1.34 0 0 1-1-.42 1.35 1.35 0 0 1-.42-1v-33.6a1.42 1.42 0 0 1 1.41-1.4h15.4a23.9 23.9 0 0 1 6.71.86 14.08 14.08 0 0 1 5 2.49 11.1 11.1 0 0 1 3.12 4 12.37 12.37 0 0 1 1.09 5.3 11.44 11.44 0 0 1-1.56 6.09 12.46 12.46 0 0 1-4.06 4.11zM804 77.11h3.8a2.08 2.08 0 0 0 1.79-.81 3 3 0 0 0 .6-1.84 3.69 3.69 0 0 0-.55-1.95 2 2 0 0 0-1.84-.91H804zm-457 48.18h-35.2v39.88l23.43 21.2v-38.7h12.62c7.95 0 11.88 3.92 11.88 10.07v29.59c0 6.15-3.71 10.28-11.88 10.28h-36.07v22.49H347c18.88.1 36.59-9.34 36.59-31.18V157c-.02-22.06-17.73-31.71-36.59-31.71zM531.5 189v-32.64c0-11.77 21-14.52 27.36-2.65l19.41-8c-7.53-16.86-21.53-21.85-33.09-21.85-18.88 0-37.54 11-37.54 32.45V189c0 21.52 18.66 32.44 37.12 32.44 11.87 0 26.08-5.93 33.93-21.31l-20.78-9.65c-5.09 13.15-26.41 10-26.41-1.48zm-64.26-28.21c-7.32-1.59-12.2-4.24-12.52-8.8.43-11 17.29-11.35 27.15-.85l15.59-12.09c-9.76-12-20.78-15.17-32.24-15.17-17.28 0-34 9.76-34 28.42 0 18.14 13.79 27.79 28.95 30.12 7.74 1.06 16.33 4.14 16.12 9.54-.63 10.18-21.42 9.65-30.86-1.9l-14.99 14.24c8.8 11.34 20.79 17.17 32 17.17 17.28 0 36.48-10.07 37.22-28.42 1.09-23.32-15.66-29.16-32.42-32.23zm-70.95 59.31h23.76v-94.81h-23.76zm400.85-94.81h-35.2v39.88l23.43 21.2v-38.7h12.52c8 0 11.87 3.92 11.87 10.07v29.59c0 6.15-3.71 10.28-11.87 10.28h-36.06v22.49H797c18.87.1 36.58-9.34 36.58-31.18V157c.15-22.06-17.58-31.71-36.44-31.71zm-172.85-1.38c-19.51 0-38.92 10.71-38.92 32.56v32.45c0 21.74 19.51 32.55 39.13 32.55s38.92-10.81 38.92-32.55v-32.45c0-21.74-19.62-32.56-39.13-32.56zm15.27 65c0 6.79-7.63 10.29-15.16 10.29s-15.27-3.4-15.27-10.29v-32.44c0-7 7.42-10.71 14.84-10.71 7.74 0 15.59 3.39 15.59 10.71zm109.23-32.45c-.53-22.27-15.59-31.18-35-31.18h-37.64v94.92h24.07V190h4.24l21.85 30.12H756l-25.66-32.56c11.45-3.62 18.45-13.49 18.45-31.09zm-34.57 12.84h-14v-21.63h14c15.05 0 15.05 21.63 0 21.63z"/>
        </svg>
    );
}

export default DiscordButton

