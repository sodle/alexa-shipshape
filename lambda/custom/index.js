/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const { Player, syncDb } = require('./shipshape');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    console.log('Sync DB');
    await syncDb();

    console.log('Launch');
    let [player, playerCreated] = await Player.findOrCreate({
        where: {
            alexaUid: handlerInput.requestEnvelope.session.user.userId
        }
    }).spread((player, playerCreated) => [player, playerCreated]);

    console.log('Player get.');
    console.log(playerCreated);

    if (playerCreated) {
      console.log('Returning response');
      return handlerInput.responseBuilder
        .speak(`Welcome to ShipShape! I see it's your first time playing. You can say "start a new game" to begin.`)
        .reprompt(`Say "start a new game" to begin.`)
        .getResponse();
    }

    let match = await player.getActiveMatch();
    console.log('Match get');

    if (match === null) {
      return handlerInput.responseBuilder
        .speak(`Welcome to ShipShape! Say "start" to play.`)
        .reprompt(`Say "start" to play.`)
        .getResponse();
    }

    let unplaced = await match.getUnplacedShips(false);
    unplaced = Object.keys(unplaced).map(key => [key, unplaced[key]]);
    if (unplaced.length !== 0) {
      return handlerInput.responseBuilder
        .speak(`Welcome to ShipShape! You have unplaced ships. Where would you like to place your ${unplaced[0].name}? It's ${unplaced[0].length} squares long.`)
        .reprompt(`Where would you like to place your ${unplaced[0].name}? It's ${unplaced[0].length} squares long.`)
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(`Welcome to ShipShape! It's your move!`)
      .reprompt(`It's your move!`)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
