import React, { useState, useEffect } from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useQueryPostLogin, useQueryCheckLogin } from "../endpoints";
import { useMutation, useQueryClient } from "react-query";

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
    marginTop: 20,
    display: "flex",
    marginLeft: "auto",
  },
});

function Login() {
  const queryClient = useQueryClient();
  const editLoginMutation = useMutation(
    async (details) => useQueryPostLogin(details.username, details.password),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("checkLogin");
      },
    }
  );

  const { data: loginData } = useQueryCheckLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div>
        Login status: {loginData?.success ? "Logged in!" : "Login failed."}
      </div>
      <FormControl className={classes.formControl}>
        <TextField
          label="Username"
          value={username}
          onChange={(n) => setUsername(n.target.value)}
          margin="dense"
        />
      </FormControl>
      <FormControl className={classes.formControl}>
        <TextField
          label="Password"
          value={password}
          onChange={(n) => setPassword(n.target.value)}
          margin="dense"
          type="password"
        />
      </FormControl>

      <Button
        variant="contained"
        className={classes.submit}
        onClick={() => {
          if (username === "" || password === "") {
            console.log("no");
            return;
          }
          editLoginMutation.mutate({
            username: username,
            password: password,
          });
        }}
      >
        Submit
      </Button>

      {editLoginMutation.isError ? (
        <div>An error has occurred: {editLoginMutation.error.message} </div>
      ) : null}

      {editLoginMutation.isSuccess ? (
        <div>Data: {JSON.stringify(editLoginMutation.data)} </div>
      ) : null}
    </div>
  );
}

export default Login;
