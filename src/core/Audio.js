import p5 from 'p5';
import 'p5/lib/addons/p5.sound.js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import AddSequenceHandler from './cmd/AddSequenceHandler';
import RemoveSequenceHandler from './cmd/RemoveSequenceHandler';
import UpdateSequenceHandler from './cmd/UpdateSequenceHandler';

import { isRoot, isEmitter, isListener } from '../util/NodeSequencerUtil';

class Audio extends CommandInterceptor {
  constructor(commandStack, elementRegistry, eventBus, sounds) {
    super(eventBus);

    window.p5 = p5;

    this._commandStack = commandStack;
    this._elementRegistry = elementRegistry;
    this._sounds = sounds;

    commandStack.registerHandler('nodeSequencer.audio.addSequence', AddSequenceHandler);
    commandStack.registerHandler('nodeSequencer.audio.removeSequence', RemoveSequenceHandler);
    commandStack.registerHandler('nodeSequencer.audio.updateSequence', UpdateSequenceHandler);

    this.phrases = {};

    this.mainPart = new p5.Part();
    // this.mainPart.loop();
    // this.mainPart.start();

    const phrase = new p5.Phrase('loopStart', (time, playbackRate) => {
      eventBus.fire('nodeSequencer.audio.loopStart');
    }, [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);

    this.mainPart.addPhrase(phrase);

    window.phrases = this.phrases;

    const reverb = new p5.Reverb();
    const delay = new p5.Delay();

    eventBus.on('nodeSequencer.sounds.loaded', () => {
      const allSounds = sounds.getSounds();

      Object.values(allSounds).forEach(soundKit => {
        Object.values(soundKit).forEach(soundObject => {
          const { sound } = soundObject;

          reverb.process(sound, 1, 2); // reverb time, decay rate
          delay.process(sound, .12, .1, 2300); // delay time, feedback, filter frequency
        });
      });
    });

    // diagram clear
    eventBus.on('diagram.clear', () => {
      Object.keys(this.phrases).forEach(key => {
        this.mainPart.removePhrase(key);
      });

      this.phrases = {};
    });

    // enable changing tempo during input
    eventBus.on('nodeSequencer.tempoControl.input', ({ tempo }) => {
      this.mainPart.setBPM(tempo);
    });
  }

  addSequence(sequence, emitter, listener) {
    const { sound } = this._sounds.getSound(listener.sound);

    const onPlay = () => {
      this._eventBus.fire('nodeSequencer.audio.playSound', {
        listener
      });
    };

    this._commandStack.execute('nodeSequencer.audio.addSequence', {
      sequence,
      emitter,
      listener,
      phrases: this.phrases,
      mainPart: this.mainPart,
      sound,
      onPlay
    });
  }

  removeSequence(emitter, listener) {
    this._commandStack.execute('nodeSequencer.audio.removeSequence', {
      emitter,
      listener,
      phrases: this.phrases,
      mainPart: this.mainPart
    });
  }

  updateSequence(sequence, emitter, listener) {
    this._commandStack.execute('nodeSequencer.audio.updateSequence', {
      sequence,
      emitter,
      listener,
      phrases: this.phrases,
      mainPart: this.mainPart
    });
  }

  getMainPart() {
    return this.mainPart;
  }

  getAllPhrases() {
    return this.phrases;
  }

  async start() {

    // resume audio
    p5.prototype.getAudioContext().resume();

    this.mainPart.loop();
    this.mainPart.start();
  }

  stop() {
    this.mainPart.stop();
  }
}

Audio.$inject = [ 'commandStack', 'elementRegistry', 'eventBus', 'sounds' ];

// export default doesn't work
export default Audio;
