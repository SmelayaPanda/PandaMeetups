import Vue from 'vue'
import Vuex from 'vuex'
import * as firebase from 'firebase'

Vue.use(Vuex)

export const store = new Vuex.Store({
  // State ---------------------------------------------------
  state: {
    loadedMeetups: [],
    user: null, // new user creates only with firebase auth()
    loading: false,
    error: null
  },
  // Mutations ---------------------------------------------------
  mutations: { // to change state
    setLoadedMeetups: (state, payload) => {
      state.loadedMeetups = payload
    },
    createMeetup: (state, payload) => {
      state.loadedMeetups.push(payload)
    },
    setUser: (state, payload) => {
      state.user = payload
    },
    setLoading: (state, payload) => {
      state.loading = payload
    },
    setError: (state, payload) => {
      state.error = payload
    },
    clearError: (state) => {
      state.error = null
    }
  },
  // Actions ---------------------------------------------------
  actions: { // specify the mutation
    loadMeetups: ({commit}) => {
      commit('setLoading', true)
      // fetch meetup data
      firebase.database().ref('meetup').once('value')
        .then((data) => {
          const meetups = []
          const obj = data.val() // .val() method of promise ?
          for (let key in obj) {
            meetups.push({
              id: key,
              title: obj[key].title,
              location: obj[key].location,
              imageUrl: obj[key].imageUrl,
              description: obj[key].description,
              date: obj[key].date,
              creatorId: obj[key].creatorId
            })
          }
          commit('setLoadedMeetups', meetups)
          commit('setLoading', false)
        })
        .catch((error) => {
          console.log(error)
          commit('setLoading', false)
        })
    },
    createMeetup: ({commit, getters}, payload) => {
      const meetup = {
        title: payload.title,
        location: payload.location,
        imageUrl: payload.imageUrl,
        description: payload.description,
        date: payload.date.toISOString(), // because date object cant be stored into firebase
        creatorId: getters.user.id
        // id generated by firebase automatically as uid property
      }
      // ref('meetup' will create if not exists JSON with name 'meetup'
      // push - for writing new data
      firebase.database().ref('meetup').push(meetup)
        .then((data) => {
          const key = data.key // Promise from firebase have unic id in key property
          commit('createMeetup', {
            ...meetup,
            id: key
          })
          console.log(data)
        })
        .catch((error) => {
          console.log(error)
        })
    },
    // Firebase authentication
    signUserUp: ({commit}, payload) => {
      commit('setLoading', true) // start loading process
      commit('clearError')
      // return a Promise
      firebase.auth().createUserAndRetrieveDataWithEmailAndPassword(payload.email, payload.password)
        .then(
          user => {
            commit('setLoading', false) // we have user == loading complete
            commit('clearError')
            const newUser = {
              id: user.uid,
              registeredMeetups: [] // new user don't have registered meetups yet
            }
            commit('setUser', newUser) // setUser - invoke mutation
          }
        )
        .catch(
          error => {
            commit('setLoading', false) // we have error == loading complete
            commit('setError', error) // in this case it is the specific object from firebase with message property
            console.log(error)
          }
        )
    },
    signUserIn: ({commit}, payload) => {
      commit('setLoading', true)
      commit('clearError')
      firebase.auth().signInAndRetrieveDataWithEmailAndPassword(payload.email, payload.password)
        .then(
          user => {
            commit('setLoading', false)
            commit('clearError')
            const registeredUser = {
              id: user.uid,
              registeredMeetups: [] // TODO: registered meetups
            }
            commit('setUser', registeredUser)
          }
        )
        .catch(
          error => {
            commit('setLoading', false)
            commit('setError', error)
            console.log(error)
          }
        )
    },
    autoSignIn: ({commit}, payload) => {
      commit('setUser', {id: payload.uid, registeredMeetups: []})
    },
    logout: ({commit}) => {
      firebase.auth().signOut()
      commit('setUser', null)
    }
  },
  // Getters  ---------------------------------------------------
  getters: {
    loadedMeetups: state => state.loadedMeetups.sort((a, b) => {
      return a.date > b.date
    }),
    loadedMeetup: state => (meetupId) => {
      return state.loadedMeetups.find((meetup) => {
        return meetup.id === meetupId
      })
    },
    feuturedMeetups: (state, getters) => getters.loadedMeetups.slice(0, 5),
    // -
    user: state => {
      return state.user
    },
    loading: state => {
      return state.loading
    },
    error: state => {
      return state.error
    }
  }
})
