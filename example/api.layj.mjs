import { layj } from "../index.mjs";

layj('User', (example) => {

    example("name only", async () => {
        return {
            name: "Jhon Doe"
        }
    });

    

    example("name and email address", async () => {
        return {
            name: "Jhon Doe",
            email: "jhon@example.com",
        }
    });

    example("error", async () => {
        return null;
    });
    

    example("user with age", async () => {
        return {
            name: "Jhon Doe",
            email: "jhon@example.com",
            age: 99,
        }
    });

    example("user likes", async () => {
        return {
            name: "Jhon Doe",
            likes: [1, "cats", false],
        }
    });

    
}, {
    snapshot: false,
});

layj('literalExample', (example) => {

    example("request 1", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 1",
        }
    });
    
    example("request 2", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 2",
        }
    });

    example("request 3", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 3",
        }
    });
    

    example("request 4", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 1",
        }
    });

    example("request 2", async () => {
        return {
            isError:true,
        }
    });
}, {
    literals:{
        isError:true,
        dataType:true,
    }
});