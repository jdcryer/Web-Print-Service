import React, { useState, useEffect } from "react";
import { FormControl, TextField, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useQueryPostLogin } from "../endpoints";
import { useMutation, useQueryClient } from "react-query";
import { FullscreenModal, Text } from "../ui-library";

const useStyles = makeStyles({
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

function ComputerLogin({ username, password, setPassword, error, submit }) {
  const classes = useStyles();
  return (
    <FullscreenModal open={open}>
      <Text large bold>
        Login to computer
      </Text>
      <FormControl className={classes.formControl}>
        <TextField
          label="Username"
          value={username}
          margin="dense"
          InputProps={{
            readOnly: true,
          }}
        />
      </FormControl>
      <FormControl className={classes.formControl}>
        <TextField
          label="Password"
          defaultValue={password}
          onChange={(n) => {
            setPassword(n.target.value);
          }}
          error={error}
          margin="dense"
          type="password"
        />
      </FormControl>
      <div className={classes.buttons}>
        <Button variant="contained" className={classes.submit} onClick={submit}>
          Submit
        </Button>
      </div>

      {error !== "" ? (
        <>
          <Text bold>Error: </Text>
          <Text error>{error}</Text>
        </>
      ) : null}
    </FullscreenModal>
  );
}

export default ComputerLogin;
