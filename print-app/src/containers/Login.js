import React, { useState, useEffect } from "react";
import { FormControl, TextField, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useQueryPostLogin } from "../endpoints";
import { useMutation, useQueryClient } from "react-query";
import { FullscreenModal, Text } from "../ui-library";

const useStyles = makeStyles({
  root: {
    backgroundColor: "white",
    border: "1px solid black",
    padding: 10,
    margin: 10,
    width: 300,
  },
  formControl: {
    width: "100%",
  },
  submit: {
    marginLeft: 10,
    marginTop: 10,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});

function Login({ open, setOpen, forced }) {
  const queryClient = useQueryClient();
  const editLoginMutation = useMutation(
    async (details) =>
      useQueryPostLogin(details.username, details.password, details.baseUrl),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries("checkLogin");
        if (result?.success) {
          setUsername("");
          setPassword("");
          setBaseUrl("");
          setIsError([]);
          setLoginState("");
          setOpen(false);
        } else {
          setLoginState(result?.error);
        }
      },
    }
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [isError, setIsError] = useState([]);

  const [loginState, setLoginState] = useState("");

  const handleSubmit = () => {
    setIsError((t) => {
      if (username === "") {
        t = t.includes("username") ? t : [...t, "username"];
      } else {
        t = t.includes("username") ? t.filter((x) => x !== "username") : t;
      }

      if (password === "") {
        t = t.includes("password") ? t : [...t, "password"];
      } else {
        t = t.includes("password") ? t.filter((x) => x !== "password") : t;
      }

      if (baseUrl === "") {
        t = t.includes("baseUrl") ? t : [...t, "baseUrl"];
      } else {
        t = t.includes("baseUrl") ? t.filter((x) => x !== "baseUrl") : t;
      }

      if (t.length > 0) {
        return t;
      }
      editLoginMutation.mutate({
        username: username,
        password: password,
        baseUrl: baseUrl,
      });
      return t;
    });
  };

  const classes = useStyles();
  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Open login
      </Button>
      <FullscreenModal open={open}>
        <Text large bold>
          Login to API
        </Text>
        <FormControl className={classes.formControl}>
          <TextField
            label="Username"
            value={username}
            onChange={(n) => {
              setIsError((t) => t.filter((x) => x !== "username"));
              setUsername(n.target.value);
            }}
            error={isError?.includes("username")}
            margin="dense"
          />
        </FormControl>
        <FormControl className={classes.formControl}>
          <TextField
            label="Password"
            value={password}
            onChange={(n) => {
              setIsError((t) => t.filter((x) => x !== "password"));
              setPassword(n.target.value);
            }}
            error={isError?.includes("password")}
            margin="dense"
            type="password"
          />
        </FormControl>

        <FormControl className={classes.formControl}>
          <TextField
            label="Base Url"
            value={baseUrl}
            onChange={(n) => {
              setIsError((t) => t.filter((x) => x !== "baseUrl"));
              setBaseUrl(n.target.value);
            }}
            error={isError?.includes("baseUrl")}
            margin="dense"
          />
        </FormControl>
        <div className={classes.buttons}>
          {forced ? null : (
            <Button
              variant="contained"
              className={classes.submit}
              onClick={() => {
                setUsername("");
                setPassword("");
                setBaseUrl("");
                setIsError([]);
                setLoginState("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            className={classes.submit}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>

        {loginState !== "" ? (
          <>
            <Text bold>Error: </Text>
            <Text error>{loginState}</Text>
          </>
        ) : null}

        {editLoginMutation.isError ? (
          <div>An error has occurred: {editLoginMutation.error.message} </div>
        ) : null}
      </FullscreenModal>
    </>
  );
}

export default Login;
