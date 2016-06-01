describe("Layer Patch Tests", function() {
    var testObject, finalObject, parser;
    var objectCache = {
        "a": {id: "a"},
        "b": {id: "b"}
    };

    beforeEach(function() {
        parser = new LayerPatchParser({
            getObjectCallback: function(id) {
                return objectCache[id];
            },
            createObjectCallback: function(id, value) {
                objectCache[id] = value;
                return value;
            }
        });

        testObject = {
            hey: "ho",
            outerSet: ["d"],
            "sub_object": {
                subhey: "subho",
                count: 5,
                "subber-object": {
                    count: 10,
                    set: ["a", "c", "z"]
                }
            }
        };

        // finalObject is a clone of testObject
        finalObject = JSON.parse(JSON.stringify(testObject));
    });

    it("Should have a parser", function() {
        expect(Boolean(parser)).toEqual(true);
        expect(parser.parse instanceof Function).toEqual(true);
    });

    describe("The SET operation", function() {
        it("Should set a property", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "hey", value: "howdy"}
                ]
            });
            finalObject.hey = "howdy";
            expect(testObject).toEqual(finalObject);
        });

        it("Should set a subproperty", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "sub_object.subhey", value: "howdy"}
                ]
            });
            finalObject["sub_object"].subhey = "howdy";
            expect(testObject).toEqual(finalObject);
        });

        it("Should set a subproperty with periods in name", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "sub_object.sub\\.hey", value: "howdy"},
                    {operation: "set", property: "a.b\\.c\\.d.e", value: "there"}
                ]
            });
            finalObject["sub_object"]["sub.hey"] = "howdy";
            finalObject.a = {"b.c.d": {e: "there"}};
            expect(testObject).toEqual(finalObject);
        });

        it("Should fail to set a subproperty of a non-object", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "set", property: "hey.ho", value: "howdy"}
                    ]
                });
            }).toThrowError("Can not access property 'hey.ho'");
        });

        it("Should set an array/set", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "sub_object.subber-object.set", value: ["z", "z", "z"]}
                ]
            });
            finalObject["sub_object"]["subber-object"].set = ["z","z","z"];
            expect(testObject).toEqual(finalObject);
        });

        it("Should set null", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "sub_object.subber-object.count", value: null}
                ]
            });
            finalObject["sub_object"]["subber-object"].count = null;
            expect(testObject).toEqual(finalObject);
        });

        it("Should create any missing structures", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "sub_object.a.b.c", value: "d"}
                ]
            });
            finalObject["sub_object"].a = {b: {c: "d"}};
            expect(testObject).toEqual(finalObject);
        });

        it("Should set by ID with valid ID", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "hey", id: "b"}
                ]
            });
            finalObject.hey = objectCache.b;
            expect(testObject).toEqual(finalObject);
        });

        it("Should set by ID with invalid ID", function() {
  	        parser = new LayerPatchParser({
        		    returnIds: true,
        		    getObjectCallback: function(id) {
                    return objectCache[id];
        		    }
      		  });


            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "hey", id: "bbb"}
                ]
            });
            finalObject.hey = "bbb";
            expect(testObject).toEqual(finalObject);
        });

        it("Should set by ID to null invalid ID", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "hey", id: "bbb"}
                ]
            });
            finalObject.hey = null;
            expect(testObject).toEqual(finalObject);
        });

        it("Should set by ID and value and register a new object", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "hey", id: "c", value: {id: "c", name: "Sea"}}
                ]
            });
            expect(objectCache.c).toEqual({id: "c", name: "Sea"});

            finalObject.hey = objectCache.c;
            expect(testObject).toEqual(finalObject);
        });
    });

    describe("The DELETE operation", function() {
        it("Should delete a property", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "delete", property: "hey"}
                ]
            });
            delete finalObject.hey;
            expect(testObject).toEqual(finalObject);
        });

        it("Should delete a subproperty", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "delete", property: "sub_object.subhey"}
                ]
            });
            delete finalObject["sub_object"].subhey;
            expect(testObject).toEqual(finalObject);
        });

        it("Should delete a subproperty with periods in name", function() {
            testObject.sub_object["a.b.c"] = {"d": "e"};
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "set", property: "sub_object.a\\.b\\.c.d", value: "howdy"}
                ]
            });
            finalObject["sub_object"]["a.b.c"] = {d: "howdy"};
            expect(testObject).toEqual(finalObject);
        });

        it("Should fail to delete a subproperty of a non-object", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "delete", property: "hey.ho", value: "howdy"}
                    ]
                });
            }).toThrowError("Can not access property 'hey.ho'");
        });

        it("Should delete an array/set", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "delete", property: "sub_object.subber-object.set"}
                ]
            });
            delete finalObject["sub_object"]["subber-object"].set;
            expect(testObject).toEqual(finalObject);
        });


        it("Should create any missing structures", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "delete", property: "sub_object.a.b.c"}
                ]
            });
            finalObject["sub_object"].a = {b: {}};
            expect(testObject).toEqual(finalObject);
        });
    });

    describe("The ADD operation", function() {
        it("Should fail if adding to a non-array", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "add", property: "hey", value: "howdy"}
                    ]
                });
            }).toThrowError("The add operation requires an array or new structure to add to.");
        });

        it("Should fail to add an array to a set", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "add", property: "outerSet", value: ["howdy"]}
                    ]
                });
            }).toThrowError("The add operation will not add arrays to sets.");
        });

        it("Should fail to add an object to a set", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "add", property: "outerSet", value: {hey: "ho"}}
                    ]
                });
            }).toThrowError("The add operation will not add objects to sets.");
        });

        it("Should fail to add a subproperty of a non-object", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "add", property: "hey.ho", value: "howdy"}
                    ]
                });
            }).toThrowError("Can not access property 'hey.ho'");
        });

        it("Should not add a copy of a value", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "outerSet", value: "d"}
                ]
            });
            expect(testObject).toEqual(finalObject);
        });

        it("Should add a subproperty", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "outerSet", value: "howdy"}
                ]
            });
            finalObject.outerSet.push("howdy");
            expect(testObject).toEqual(finalObject);
        });

        it("Should add a subproperty with periods in name", function() {
            testObject.sub_object["a.b.c"] = {"d": ["a", "b"]};
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "sub_object.a\\.b\\.c.d", value: "howdy"}
                ]
            });
            finalObject["sub_object"]["a.b.c"] = {d: ["a", "b", "howdy"]};
            expect(testObject).toEqual(finalObject);
        });

        it("Should set a subproperty", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "sub_object.subber-object.set", value: "howdy"}
                ]
            });
            finalObject["sub_object"]["subber-object"].set.push("howdy");
            expect(testObject).toEqual(finalObject);
        });

        it("Should create any missing structures", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "sub_object.a.b.c", value: "d"}
                ]
            });
            finalObject["sub_object"].a = {b: {c: ["d"]}};
            expect(testObject).toEqual(finalObject);
        });

        it("Should add by ID with valid ID", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "outerSet", id: "b"}
                ]
            });
            finalObject.outerSet.push(objectCache.b);
            expect(testObject).toEqual(finalObject);
        });

        it("Should add by ID with valid ID only once", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "outerSet", id: "b"},
                    {operation: "add", property: "outerSet", id: "b"}
                ]
            });
            finalObject.outerSet.push(objectCache.b);
            expect(testObject).toEqual(finalObject);
        });

        it("Should add by ID and value and register a new object", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "add", property: "outerSet", id: "d", value: {id: "d", name: "inDeed"}},
                    {operation: "add", property: "outerSet", id: "d"},
                ]
            });
            expect(objectCache.d).toEqual({id: "d", name: "inDeed"});

            finalObject.outerSet.push(objectCache.d);
            expect(testObject).toEqual(finalObject);
        });
    });

    describe("The REMOVE operation", function() {
        it("Should fail if removing from a non-array", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "remove", property: "hey", value: "howdy"}
                    ]
                });
            }).toThrowError("The remove operation requires an array or new structure to remove from.");
        });

        it("Should fail to remove an array from a set", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "remove", property: "outerSet", value: ["howdy"]}
                    ]
                });
            }).toThrowError("The remove operation will not remove arrays from sets.");
        });

        it("Should fail to remove an object from a set", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "remove", property: "outerSet", value: {hey: "ho"}}
                    ]
                });
            }).toThrowError("The remove operation will not remove objects from sets.");
        });

        it("Should fail to remove a subproperty of a non-object", function() {
            expect(function() {
                parser.parse({
                    object: testObject,
                    operations:  [
                        {operation: "remove", property: "hey.ho", value: "howdy"}
                    ]
                });
            }).toThrowError("Can not access property 'hey.ho'");
        });

        it("Should remove a subproperty", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "outerSet", value: "d"}
                ]
            });
            finalObject.outerSet = [];
            expect(testObject).toEqual(finalObject);
        });

        it("Should remove a subproperty with periods in name", function() {
            testObject.sub_object["a.b.c"] = {"d": ["a", "b"]};
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "sub_object.a\\.b\\.c.d", value: "a"}
                ]
            });
            finalObject["sub_object"]["a.b.c"] = {d: ["b"]};
            expect(testObject).toEqual(finalObject);
        });

        it("Should not remove if not present", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "outerSet", value: "e"}
                ]
            });
            expect(testObject).toEqual(finalObject);
        });

        it("Should remove from a subproperty", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "sub_object.subber-object.set", value: "a"}
                ]
            });
            finalObject["sub_object"]["subber-object"].set.shift();
            expect(testObject).toEqual(finalObject);
        });

        it("Should create any missing structures", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "sub_object.a.b.c", value: "d"}
                ]
            });
            finalObject["sub_object"].a = {b: {c: []}};
            expect(testObject).toEqual(finalObject);
        });

        it("Should remove by ID with valid ID", function() {
            testObject.outerSet.push(objectCache.b);

            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "outerSet", id: "b"}
                ]
            });
            expect(testObject).toEqual(finalObject);
        });

        it("Should remove by ID with valid ID only once", function() {
            testObject.outerSet.push(objectCache.b);

            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "outerSet", id: "b"},
                    {operation: "remove", property: "outerSet", id: "b"}
                ]
            });
            expect(testObject).toEqual(finalObject);
        });

        it("Should remove by ID with not-found id resulting in noop", function() {
            parser.parse({
                object: testObject,
                operations:  [
                    {operation: "remove", property: "outerSet", id: "bbbb"}
                ]
            });
            expect(testObject).toEqual(finalObject);
        });
    });

    xdescribe("Add by Index", function() {});
    xdescribe("Remove by Index", function() {});
    xdescribe("Add by Index and Value", function() {});
});
