/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var expect = chai.expect;

describe("loop.conversationViews", function () {
  "use strict";

  var sharedUtils = loop.shared.utils;
  var sandbox, oldTitle, view, dispatcher, contact, fakeAudioXHR;

  var CALL_STATES = loop.store.CALL_STATES;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    oldTitle = document.title;
    sandbox.stub(document.mozL10n, "get", function(x) {
      return x;
    });

    dispatcher = new loop.Dispatcher();
    sandbox.stub(dispatcher, "dispatch");

    contact = {
      name: [ "mrsmith" ],
      email: [{
        type: "home",
        value: "fakeEmail",
        pref: true
      }]
    };
    fakeAudioXHR = {
      open: sinon.spy(),
      send: function() {},
      abort: function() {},
      getResponseHeader: function(header) {
        if (header === "Content-Type")
          return "audio/ogg";
      },
      responseType: null,
      response: new ArrayBuffer(10),
      onload: null
    };

    navigator.mozLoop = {
      getLoopPref: sinon.stub().returns("http://fakeurl"),
      composeEmail: sinon.spy(),
      get appVersionInfo() {
        return {
          version: "42",
          channel: "test",
          platform: "test"
        };
      },
      getAudioBlob: sinon.spy(function(name, callback) {
        callback(null, new Blob([new ArrayBuffer(10)], {type: "audio/ogg"}));
      }),
      userProfile: {
        email: "bob@invalid.tld"
      }
    };
  });

  afterEach(function() {
    document.title = oldTitle;
    view = undefined;
    delete navigator.mozLoop;
    sandbox.restore();
  });

  describe("CallIdentifierView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.CallIdentifierView(props));
    }

    it("should set display the peer identifer", function() {
      view = mountTestComponent({
        showIcons: false,
        peerIdentifier: "mrssmith"
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-call-identifier-text").props.children).eql("mrssmith");
    });

    it("should not display the icons if showIcons is false", function() {
      view = mountTestComponent({
        showIcons: false,
        peerIdentifier: "mrssmith"
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-call-detail").props.className).to.contain("hide");
    });

    it("should display the icons if showIcons is true", function() {
      view = mountTestComponent({
        showIcons: true,
        peerIdentifier: "mrssmith"
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-call-detail").props.className).to.not.contain("hide");
    });

    it("should display the url timestamp", function() {
      sandbox.stub(loop.shared.utils, "formatDate").returns(("October 9, 2014"));

      view = mountTestComponent({
        showIcons: true,
        peerIdentifier: "mrssmith",
        urlCreationDate: (new Date() / 1000).toString()
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-conversation-timestamp").props.children).eql("(October 9, 2014)");
    });

    it("should show video as muted if video is false", function() {
      view = mountTestComponent({
        showIcons: true,
        peerIdentifier: "mrssmith",
        video: false
      });

      expect(TestUtils.findRenderedDOMComponentWithClass(
        view, "fx-embedded-tiny-video-icon").props.className).to.contain("muted");
    });
  });

  describe("ConversationDetailView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.ConversationDetailView(props));
    }

    it("should set the document title to the calledId", function() {
      mountTestComponent({contact: contact});

      expect(document.title).eql("mrsmith");
    });

    it("should fallback to the email if the contact name is not defined",
      function() {
        delete contact.name;

        mountTestComponent({contact: contact});

        expect(document.title).eql("fakeEmail");
      });
  });

  describe("PendingConversationView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.PendingConversationView(props));
    }

    it("should set display connecting string when the state is not alerting",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher
        });

        var label = TestUtils.findRenderedDOMComponentWithClass(
          view, "btn-label").props.children;

        expect(label).to.have.string("connecting");
    });

    it("should set display ringing string when the state is alerting",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.ALERTING,
          contact: contact,
          dispatcher: dispatcher
        });

        var label = TestUtils.findRenderedDOMComponentWithClass(
          view, "btn-label").props.children;

        expect(label).to.have.string("ringing");
    });

    it("should disable the cancel button if enableCancelButton is false",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher,
          enableCancelButton: false
        });

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        expect(cancelBtn.classList.contains("disabled")).eql(true);
      });

    it("should enable the cancel button if enableCancelButton is false",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher,
          enableCancelButton: true
        });

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        expect(cancelBtn.classList.contains("disabled")).eql(false);
      });

    it("should dispatch a cancelCall action when the cancel button is pressed",
      function() {
        view = mountTestComponent({
          callState: CALL_STATES.CONNECTING,
          contact: contact,
          dispatcher: dispatcher
        });

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        React.addons.TestUtils.Simulate.click(cancelBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "cancelCall"));
      });
  });

  describe("CallFailedView", function() {
    var store, fakeAudio;

    var contact = {email: [{value: "test@test.tld"}]};

    function mountTestComponent(options) {
      options = options || {};
      return TestUtils.renderIntoDocument(
        loop.conversationViews.CallFailedView({
          dispatcher: dispatcher,
          store: store,
          contact: options.contact
        }));
    }

    beforeEach(function() {
      store = new loop.store.ConversationStore({}, {
        dispatcher: dispatcher,
        client: {},
        sdkDriver: {}
      });
      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy(),
        removeAttribute: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);
    });

    it("should dispatch a retryCall action when the retry button is pressed",
      function() {
        view = mountTestComponent({contact: contact});

        var retryBtn = view.getDOMNode().querySelector('.btn-retry');

        React.addons.TestUtils.Simulate.click(retryBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "retryCall"));
      });

    it("should dispatch a cancelCall action when the cancel button is pressed",
      function() {
        view = mountTestComponent({contact: contact});

        var cancelBtn = view.getDOMNode().querySelector('.btn-cancel');

        React.addons.TestUtils.Simulate.click(cancelBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "cancelCall"));
      });

    it("should dispatch a fetchRoomEmailLink action when the email button is pressed",
      function() {
        view = mountTestComponent({contact: contact});

        var emailLinkBtn = view.getDOMNode().querySelector('.btn-email');

        React.addons.TestUtils.Simulate.click(emailLinkBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "fetchRoomEmailLink"));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("roomOwner", navigator.mozLoop.userProfile.email));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("roomName", "test@test.tld"));
      });

    it("should name the created room using the contact name when available",
      function() {
        view = mountTestComponent({contact: {
          email: [{value: "test@test.tld"}],
          name: ["Mr Fake ContactName"]
        }});

        var emailLinkBtn = view.getDOMNode().querySelector('.btn-email');

        React.addons.TestUtils.Simulate.click(emailLinkBtn);

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("roomName", "Mr Fake ContactName"));
      });

    it("should disable the email link button once the action is dispatched",
      function() {
        view = mountTestComponent({contact: contact});
        var emailLinkBtn = view.getDOMNode().querySelector('.btn-email');
        React.addons.TestUtils.Simulate.click(emailLinkBtn);

        expect(view.getDOMNode().querySelector(".btn-email").disabled).eql(true);
      });

    it("should compose an email once the email link is received", function() {
      var composeCallUrlEmail = sandbox.stub(sharedUtils, "composeCallUrlEmail");
      view = mountTestComponent({contact: contact});
      store.set("emailLink", "http://fake.invalid/");

      sinon.assert.calledOnce(composeCallUrlEmail);
      sinon.assert.calledWithExactly(composeCallUrlEmail,
        "http://fake.invalid/", "test@test.tld");
    });

    it("should close the conversation window once the email link is received",
      function() {
        sandbox.stub(window, "close");
        view = mountTestComponent({contact: contact});

        store.set("emailLink", "http://fake.invalid/");

        sinon.assert.calledOnce(window.close);
      });

    it("should display an error message in case email link retrieval failed",
      function() {
        view = mountTestComponent({contact: contact});

        store.trigger("error:emailLink");

        expect(view.getDOMNode().querySelector(".error")).not.eql(null);
      });

    it("should allow retrying to get a call url if it failed previously",
      function() {
        view = mountTestComponent({contact: contact});

        store.trigger("error:emailLink");

        expect(view.getDOMNode().querySelector(".btn-email").disabled).eql(false);
      });

    it("should play a failure sound, once", function() {
      view = mountTestComponent({contact: contact});

      sinon.assert.calledOnce(navigator.mozLoop.getAudioBlob);
      sinon.assert.calledWithExactly(navigator.mozLoop.getAudioBlob,
                                     "failure", sinon.match.func);
      sinon.assert.calledOnce(fakeAudio.play);
      expect(fakeAudio.loop).to.equal(false);
    });
  });

  describe("OngoingConversationView", function() {
    function mountTestComponent(props) {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.OngoingConversationView(props));
    }

    it("should dispatch a setupStreamElements action when the view is created",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher
        });

        sinon.assert.calledOnce(dispatcher.dispatch);
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "setupStreamElements"));
      });

    it("should dispatch a hangupCall action when the hangup button is pressed",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher
        });

        var hangupBtn = view.getDOMNode().querySelector('.btn-hangup');

        React.addons.TestUtils.Simulate.click(hangupBtn);

        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "hangupCall"));
      });

    it("should dispatch a setMute action when the audio mute button is pressed",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher,
          audio: {enabled: false}
        });

        var muteBtn = view.getDOMNode().querySelector('.btn-mute-audio');

        React.addons.TestUtils.Simulate.click(muteBtn);

        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "setMute"));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("enabled", true));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("type", "audio"));
      });

    it("should dispatch a setMute action when the video mute button is pressed",
      function() {
        view = mountTestComponent({
          dispatcher: dispatcher,
          video: {enabled: true}
        });

        var muteBtn = view.getDOMNode().querySelector('.btn-mute-video');

        React.addons.TestUtils.Simulate.click(muteBtn);

        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("name", "setMute"));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("enabled", false));
        sinon.assert.calledWithMatch(dispatcher.dispatch,
          sinon.match.hasOwn("type", "video"));
      });

    it("should set the mute button as mute off", function() {
      view = mountTestComponent({
        dispatcher: dispatcher,
        video: {enabled: true}
      });

      var muteBtn = view.getDOMNode().querySelector('.btn-mute-video');

      expect(muteBtn.classList.contains("muted")).eql(false);
    });

    it("should set the mute button as mute on", function() {
      view = mountTestComponent({
        dispatcher: dispatcher,
        audio: {enabled: false}
      });

      var muteBtn = view.getDOMNode().querySelector('.btn-mute-audio');

      expect(muteBtn.classList.contains("muted")).eql(true);
    });
  });

  describe("OutgoingConversationView", function() {
    var store, feedbackStore;

    function mountTestComponent() {
      return TestUtils.renderIntoDocument(
        loop.conversationViews.OutgoingConversationView({
          dispatcher: dispatcher,
          store: store,
          feedbackStore: feedbackStore
        }));
    }

    beforeEach(function() {
      store = new loop.store.ConversationStore({}, {
        dispatcher: dispatcher,
        client: {},
        sdkDriver: {}
      });
      feedbackStore = new loop.store.FeedbackStore(dispatcher, {
        feedbackClient: {}
      });
    });

    it("should render the CallFailedView when the call state is 'terminated'",
      function() {
        store.set({callState: CALL_STATES.TERMINATED});

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.CallFailedView);
    });

    it("should render the PendingConversationView when the call state is 'gather'",
      function() {
        store.set({
          callState: CALL_STATES.GATHER,
          contact: contact
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.PendingConversationView);
    });

    it("should render the OngoingConversationView when the call state is 'ongoing'",
      function() {
        store.set({callState: CALL_STATES.ONGOING});

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.OngoingConversationView);
    });

    it("should render the FeedbackView when the call state is 'finished'",
      function() {
        store.set({callState: CALL_STATES.FINISHED});

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.shared.views.FeedbackView);
    });

    it("should play the terminated sound when the call state is 'finished'",
      function() {
        var fakeAudio = {
          play: sinon.spy(),
          pause: sinon.spy(),
          removeAttribute: sinon.spy()
        };
        sandbox.stub(window, "Audio").returns(fakeAudio);

        store.set({callState: CALL_STATES.FINISHED});

        view = mountTestComponent();

        sinon.assert.calledOnce(fakeAudio.play);
    });

    it("should update the rendered views when the state is changed.",
      function() {
        store.set({
          callState: CALL_STATES.GATHER,
          contact: contact
        });

        view = mountTestComponent();

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.PendingConversationView);

        store.set({callState: CALL_STATES.TERMINATED});

        TestUtils.findRenderedComponentWithType(view,
          loop.conversationViews.CallFailedView);
    });
  });
});