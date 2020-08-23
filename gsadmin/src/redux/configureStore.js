import { createStore, combineReducers, applyMiddleware } from 'redux';
import { createForms, formReducer } from 'react-redux-form';
//import { Dishes } from './dishes';
import { Auth } from './auth';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

export const ConfigureStore = () => {
    const store = createStore(
        combineReducers({
            //dishes: Dishes,
            auth: Auth
        }),
        applyMiddleware(thunk, logger)
    );

    return store;
}