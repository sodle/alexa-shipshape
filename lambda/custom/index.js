/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const { Player } = require('./shipshape');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
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
    unplaced = Object.keys(unplaced).map(key => {return {name: key, length: unplaced[key]}});
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

const StartIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StartIntent';
  },
  async handle(handlerInput) {
    let [player, playerCreated] = await Player.findOrCreate({
      where: {
          alexaUid: handlerInput.requestEnvelope.session.user.userId
      }
    }).spread((player, playerCreated) => [player, playerCreated]);

    if (await player.getActiveMatch() !== null) {
      return handlerInput.responseBuilder
        .speak('You already have a game in progress. Make your move, or say "forfeit".')
        .reprompt('What would you like to do?')
        .getResponse();
    }

    let match = await player.startMatch('bender');

    let unplacedAi = await match.getUnplacedShips(true);
    unplacedAi = Object.keys(unplacedAi).map(key => [key, unplacedAi[key]]);
    if (unplacedAi.length !== 0) {
        console.log('Placing AI ships.');
        for (let unplacedShip of unplacedAi) {
            let [name, len] = unplacedShip;
            let success = false;
            console.log(`Placing ${name} - ${len}`);
            while (!success) {
                let [vertical, x, y] = placeShipRandomly(len);
                try {
                    await match.placeShip(name, len, x, y, vertical, true);
                    console.log(`Placed ${name}`);
                    success = true;
                } catch(e) {
                    console.log(e);
                }
            }
        }
    }

    let unplacedFriendly = await match.getUnplacedShips(false);
    unplacedFriendly = Object.keys(unplacedFriendly).map(key => {return {name: key, length: unplacedFriendly[key]}});
    return handlerInput.responseBuilder
      .speak(`It's time to place your ships. Where would you like to place your ${unplacedFriendly[0].name}? It's ${unplacedFriendly[0].length} squares long.`)
      .reprompt(`Where would you like to place your ${unplacedFriendly[0].name}? It's ${unplacedFriendly[0].length} squares long.`)
      .getResponse();
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Say "start" to start a new game.';

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

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    StartIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
