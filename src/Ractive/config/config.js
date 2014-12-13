import css from './custom/css/css';
import data from './custom/data';
import template from './custom/template/template';
import defaults from './defaults';
import parseOptions from './parseOptions';
import registries from './registries';
import wrapPrototype from './wrapPrototypeMethod';
import deprecate from './deprecate';

var config, order, defaultKeys, custom, isBlacklisted, isStandardKey;

custom = {
	data: data,
	template: template,
	css: css
};

defaultKeys = Object.keys( defaults );

isStandardKey = makeObj( defaultKeys.filter( key => !custom[ key ] && !~parseOptions.indexOf( key ) ) );

// blacklisted keys that we don't double extend
isBlacklisted = makeObj( defaultKeys.concat( registries.map( r => r.name ) ) );

order = [].concat(
	custom.data,
	parseOptions,
	defaultKeys.filter( key => !registries[ key ] && !custom[ key ] && !~parseOptions.indexOf( key ) ),
	registries,
	custom.template,
	custom.css
);

config = {
	extend: ( Parent, proto, options ) => configure( 'extend', Parent, proto, options ),

	init: ( Parent, ractive, options ) => configure( 'init', Parent, ractive, options ),

	reset: ractive => {
		return order.filter( c => {
			return c.reset && c.reset( ractive );
		}).map( c => c.name );
	},

	// this defines the order. TODO this isn't used anywhere in the codebase,
	// only in the test suite - should get rid of it
	order: order,

	// TODO kill this off
	getConstructTarget: ( ractive, options ) => {
		if ( options.onconstruct ) {
			// pretend this object literal is the ractive instance
			return {
				onconstruct: wrapPrototype( ractive, 'onconstruct', options.onconstruct ).bind(ractive),
				fire: ractive.fire.bind(ractive)
			};
		} else {
			return ractive;
		}
	}
};

function configure ( method, Parent, instance, options ) {
	deprecate( options );

	data[ method ]( Parent, instance, options );

	parseOptions.forEach( key => {
		if ( key in options ) {
			instance[ key ] = options[ key ];
		}
	});

	for ( let key in options ) {
		if ( isStandardKey[ key ] ) {
			let value = options[ key ];
			instance[ key ] = ( typeof value === 'function' )
				? wrapPrototype( Parent.prototype, key, value )
				: value;
		}
	}

	registries.forEach( registry => {
		registry[ method ]( Parent, instance, options );
	});

	template[ method ]( Parent, instance, options );
	css[ method ]( Parent, instance, options );

	extendOtherMethods( Parent.prototype, instance, options );
}

function extendOtherMethods ( parent, instance, options ) {
	for ( let key in options ) {
		if ( !isBlacklisted[ key ] && options.hasOwnProperty( key ) ) {
			let member = options[ key ];

			// if this is a method that overwrites a method, wrap it:
			if ( typeof member === 'function' ) {
				member = wrapPrototype( parent, key, member );
			}

			instance[ key ] = member;
		}
	}
}

function makeObj ( array ) {
	var obj = {};
	array.forEach( x => obj[x] = true );
	return obj;
}

export default config;
