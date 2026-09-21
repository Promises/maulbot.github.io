import {FC} from 'react';
import Hero from '../components/Hero';
import DiscordSection from '../components/DiscordSection';
import SourceSection from '../components/SourceSection';
import Credits from '../components/Credits';

const HomePage: FC = () => (
    <>
        <Hero/>
        <DiscordSection/>
        <SourceSection/>
        <Credits/>
    </>
);

export default HomePage;
