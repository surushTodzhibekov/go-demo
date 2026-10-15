import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useAppDispatch, useAppSelector } from "./ReduxHooks";
import { setImage } from "../redux/requests/IdentificationRequests";

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const operator = useAppSelector((state) => state.user.operator);

  const [frontPassportPhotoBase64, setFrontPassportPhotoBase64] = useState<
    string | null
  >(null);

  const [backPassportPhotoBase64, setBackPassportPhotoBase64] = useState<
    string | null
  >(null);

  const [facePhotoBase64, setFacePhotoBase64] = useState<string | null>(null);

  useEffect(() => {
    console.log("operator: start => ", operator);
    if (operator) {
      console.log("operator: after => ", operator);
      socket.io.opts.query = { id: operator.id };

      if (!socket.connected) socket.connect();

      socket.on("frontPassportPhoto", async (token: string) => {
        if (!token) return;
        const image = await dispatch(setImage(token));
        if (image)
          setFrontPassportPhotoBase64(`data:image/png;base64,${image}`);
      });

      socket.on("backPassportPhoto", async (token: string) => {
        if (!token) return;
        const image = await dispatch(setImage(token));
        if (image) setBackPassportPhotoBase64(`data:image/png;base64,${image}`);
      });

      socket.on("facePhoto", async (token: string) => {
        if (!token) return;
        const image = await dispatch(setImage(token));
        if (image) setFacePhotoBase64(`data:image/png;base64,${image}`);
      });

      return () => {
        socket.off("frontPassportPhoto");
        socket.off("backPassportPhoto");
        socket.off("facePhoto");
        socket.disconnect();
      };
    }
  }, [operator]);

  return {
    frontPassportPhotoBase64,
    backPassportPhotoBase64,
    facePhotoBase64,
    setFrontPassportPhotoBase64,
    setBackPassportPhotoBase64,
    setFacePhotoBase64,
  };
};
