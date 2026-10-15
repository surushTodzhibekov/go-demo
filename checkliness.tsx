import axios from "axios";
import { AppDispatch } from "../Store";
import {
  AUTH_VERIFICATION_URL,
  CHECK_LIVENESS_URL,
  COMPARE_FACE_URL,
  GET_CLIENT_BY_PASSPORT_URL,
  GET_CLIENT_BY_TIN_URL,
  GET_IMAGE_URL,
  GET_PASSPORT_DATA_URL,
  IMZO_UPDATE_USER_URL,
  LOGIN_URL,
  SEND_OTP_CODE_URL,
  SET_RESULT_URL,
  VERIFY_OTP_CODE_URL,
} from "./endpoints";
import { userSlice } from "../reducers/UserSlice";
import {
  ICompareFacesData,
  ILivenessData,
  ISetResultBody,
  IUserImzoBody,
} from "../types/IdentificationTypes";
import {
  IClientBackPassportData,
  IClientFrontPassportData,
  IOrganization,
} from "../types/UserTypes";
import SHA256 from "crypto-js/sha256";
import { authKey } from "../../config";

export const verification = (jwt: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(userSlice.actions.getOperatorLoading());
    const res = await axios.get(AUTH_VERIFICATION_URL, {
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    });
    dispatch(userSlice.actions.getOperatorSuccess(res.data));
    return { data: res.data, isPass: true };
  } catch (error: any) {
    console.log(error);
    dispatch(userSlice.actions.getOperatorFailed(error.message));
    return { data: { id: 0, isAdmin: false }, isPass: false };
  }
};

export const userLogin =
  (username: string, password: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.loginLoading());
      const sign = SHA256(username + password + authKey);
      const res = await axios.post(
        LOGIN_URL,
        {
          username: username,
          password: password,
        },
        {
          headers: {
            auth: `${sign}`,
          },
        },
      );
      dispatch(userSlice.actions.loginSuccess());
      return res.data.token;
    } catch (error: any) {
      console.log(error);
      dispatch(userSlice.actions.loginFailed(error.response.data.message));
      return null;
    }
  };

export const setImage = (token: string) => async () => {
  try {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return;
    const res = await axios.get(`${GET_IMAGE_URL}?token=${token}`, {
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    });
    return res.data;
  } catch (e) {
    console.log(e);
  }
};

export const getFrontPassportData =
  (base64: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.getFrontPassportDataLoading());
      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const res = await axios.post(
        GET_PASSPORT_DATA_URL,
        { base64: base64 },
        {
          headers: {
            authorization: `Bearer ${jwt}`,
          },
        },
      );
      if (!res.data) {
        return false;
      }
      const result = res.data as IClientFrontPassportData;
      if (
        (result.Status === "Ok" &&
          !result["Document Name"].includes("Tajikistan - Id Card")) ||
        result["Document Name"].includes("Side B")
      ) {
        dispatch(
          userSlice.actions.getFrontPassportDataFailed(
            "Отсутствует лицевая сторона паспорта клиента!",
          ),
        );
        return false;
      }
      dispatch(userSlice.actions.getFrontPassportDataSuccess(res.data));
      return res.data as IClientFrontPassportData;
    } catch (error: any) {
      console.log(error);
      dispatch(
        userSlice.actions.getFrontPassportDataFailed(
          "Не удалось считать данные с лицевой стороны паспорта!",
        ),
      );
      return false;
    }
  };

export const getBackPassportData =
  (base64: string, frontPassportData: IClientFrontPassportData) =>
  async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.getBackPassportDataLoading());

      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const res = await axios.post(
        GET_PASSPORT_DATA_URL,
        { base64: base64 },
        {
          headers: {
            authorization: `Bearer ${jwt}`,
          },
        },
      );

      if (!res.data) {
        return false;
      }

      const result = res.data as IClientBackPassportData;
      if (
        (result.Status === "Ok" &&
          !result["Document Name"].includes("Tajikistan - Id Card")) ||
        !result["Document Name"].includes("Side B")
      ) {
        dispatch(
          userSlice.actions.getBackPassportDataFailed(
            "Отсутствует оборотная сторона паспорта клиента!",
          ),
        );
        return false;
      }

      if (
        frontPassportData?.["Personal Number"] !== result.MRZ["Personal Number"]
      ) {
        dispatch(
          userSlice.actions.getBackPassportDataFailed(
            "Несоответствие между лицевой и оборотной сторонами паспорта!",
          ),
        );
        return false;
      }
      dispatch(userSlice.actions.getBackPassportDataSuccess(result));
      return result;
    } catch (error: any) {
      console.log(error);
      dispatch(
        userSlice.actions.getBackPassportDataFailed(
          "Не удалось считать данные с задней стороны паспорта!",
        ),
      );
      return false;
    }
  };

export const checkLiveness =
  (base64: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.checkLivenessLoading());
      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const res = await axios.post(
        CHECK_LIVENESS_URL,
        { base64: base64 },
        {
          headers: {
            authorization: `Bearer ${jwt}`,
          },
        },
      );
      if (!res.data.result) return false;
      const result = res.data.result as ILivenessData[];
      if (result.length === 0) {
        dispatch(
          userSlice.actions.checkLivenessFailed(
            "Фотография не позволяет идентифицировать лицо клиента",
          ),
        );
        return false;
      }

      const filteredData = result.filter((item) => item.liveness < 0.5);
      if (filteredData.length > 0) {
        dispatch(
          userSlice.actions.checkLivenessFailed(
            "Лицо клиента на фотографии не является реальным!",
          ),
        );
        return false;
      }
      dispatch(userSlice.actions.checkLivenessSuccess());
      return true;
    } catch (error: any) {
      console.log(error);
      dispatch(
        userSlice.actions.checkLivenessFailed("Ошибка при проверке лица!"),
      );
      return false;
    }
  };

export const compareFaces =
  (base64_1: string, base64_2: string, isFaceControl: boolean) =>
  async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.compareFacesLoading());
      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const res = await axios.post(
        COMPARE_FACE_URL,
        {
          base64_1: base64_1,
          base64_2: base64_2,
          isVerification: isFaceControl,
        },
        {
          headers: {
            authorization: `Bearer ${jwt}`,
          },
        },
      );
      if (!res.data.result) return false;
      const result = res.data.result as ICompareFacesData[];

      const filteredCompareFacesData = result.filter(
        (item) => item.similarity >= 0.62,
      );
      if (filteredCompareFacesData.length === 1) {
        dispatch(userSlice.actions.compareFacesSuccess());
        return true;
      } else {
        if (isFaceControl) {
          dispatch(
            userSlice.actions.compareFacesFailed(
              "Предоставленные паспортные данные принадлежат другому лицу",
            ),
          );
          return false;
        }
        dispatch(
          userSlice.actions.compareFacesFailed(
            "Предоставленный паспорт не принадлежит клиенту",
          ),
        );
        return false;
      }
    } catch (error: any) {
      console.log(error);
      dispatch(userSlice.actions.compareFacesFailed("Ошибка сравнения лиц!"));
      return false;
    }
  };

export const getClientByTin =
  (tin: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.getClientDataLoading());

      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const res = await axios.get(`${GET_CLIENT_BY_TIN_URL}?tin=${tin}`, {
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      });
      dispatch(userSlice.actions.getClientDataSuccess(res.data));
      return true;
    } catch (error: any) {
      console.log(error.status);
      if (error.status === 404) {
        dispatch(
          userSlice.actions.getClientDataFailed(
            "Данные указаны неверно или отсутствуют. Пожалуйста, пройдите идентификацию",
          ),
        );
        return false;
      }
      dispatch(
        userSlice.actions.getClientDataFailed(
          "Ошибка при получении данных по ИНН!",
        ),
      );
      return false;
    }
  };

export const getClientByPassport =
  (passportNumber: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.getClientDataLoading());

      const jwt = localStorage.getItem("jwt");
      const legalEntity = localStorage.getItem("legal_entity");
      if (!jwt) return false;
      const res = await axios.get(
        `${GET_CLIENT_BY_PASSPORT_URL}?passport_number=${passportNumber}&legal_entity=${legalEntity}`,
        {
          headers: {
            authorization: `Bearer ${jwt}`,
          },
        },
      );
      dispatch(userSlice.actions.getClientDataSuccess(res.data));
      return true;
    } catch (error: any) {
      console.log(error.status);
      if (error.status === 404) {
        dispatch(
          userSlice.actions.getClientDataFailed(
            "Данные указаны неверно или отсутствуют. Пожалуйста, пройдите идентификацию",
          ),
        );
        return false;
      }
      dispatch(
        userSlice.actions.getClientDataFailed(
          "Ошибка при получении данных по номеру паспорта!",
        ),
      );
      return false;
    }
  };

export const setResult =
  (data: ISetResultBody) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.setResultLoading());
      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const res = await axios.post(SET_RESULT_URL, data, {
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      });
      dispatch(userSlice.actions.setResultSuccess());
      return res.data;
    } catch (error: any) {
      console.log(error);
      dispatch(
        userSlice.actions.setResultFailed("Не удалось передать результаты"),
      );
      return false;
    }
  };

export const updateImzoUser =
  (data: IUserImzoBody) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.updateImzoUserLoading());
      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      await axios.post(IMZO_UPDATE_USER_URL, data, {
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      });
      dispatch(userSlice.actions.updateImzoUserSuccess());
      return true;
    } catch (error: any) {
      console.log(error);
      dispatch(
        userSlice.actions.updateImzoUserFailed(
          "Не удалось сохранить изменения!",
        ),
      );
      return false;
    }
  };

export const resetStates = () => (dispatch: AppDispatch) => {
  dispatch(userSlice.actions.resetStates());
};

export const startDesktop =
  (userId: number) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.openCameraLoading());
      const res = await fetch(`http://localhost:5000/start?id=${userId}`);
      const data = await res.json();
      if (data?.status === "started") {
        dispatch(userSlice.actions.openCameraSuccess());
        return true;
      } else {
        dispatch(userSlice.actions.openCameraFailed("Камера уже открыта!"));
        return false;
      }
    } catch (e) {
      console.log(e);
      dispatch(
        userSlice.actions.openCameraFailed("Не удалось подключиться к агенту!"),
      );
      return false;
    }
  };

export const sendOtpCode = (phone: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(userSlice.actions.sendCodeLoading());
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return false;
    const response = await axios.post(
      SEND_OTP_CODE_URL,
      {
        phone: phone,
      },
      {
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      },
    );
    dispatch(
      userSlice.actions.sendCodeSuccess({
        wasTheCodeSent: true,
        expireAt: response.data.expireAt,
      }),
    );
    return true;
  } catch (error: any) {
    console.log(error);
    dispatch(userSlice.actions.sendCodeFailed("Не удалось отправить SMS код!"));
    return false;
  }
};

export const verifyOtpCode =
  (phone: string, otpCode: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(userSlice.actions.verifyCodeLoading());
      const jwt = localStorage.getItem("jwt");
      if (!jwt) return false;
      const response = await axios.post(
        VERIFY_OTP_CODE_URL,
        {
          phone: phone,
          code: otpCode,
        },
        {
          headers: {
            authorization: `Bearer ${jwt}`,
          },
        },
      );
      dispatch(userSlice.actions.verifyCodeSuccess(phone));
      return true;
    } catch (error: any) {
      console.log(error);
      dispatch(userSlice.actions.verifyCodeFailed("Неправильный код введен!"));
      return false;
    }
  };

export const onExpireOtpCode = () => (dispatch: AppDispatch) => {
  dispatch(userSlice.actions.sendCodeLoading());
  dispatch(userSlice.actions.sendCodeFailed(""));
};

export const onOrganizationSelect =
  (organization: IOrganization) => (dispatch: AppDispatch) => {
    dispatch(userSlice.actions.setOrganization(organization));
  };
