import { FC, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/ReduxHooks";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../hooks/useSocket";
import {
  checkLiveness,
  compareFaces,
  getBackPassportData,
  getFrontPassportData,
  setResult,
  startDesktop,
} from "../../../redux/requests/IdentificationRequests";
import { toastError, toastSuccess } from "../../../utils/toast";
import { userSlice } from "../../../redux/reducers/UserSlice";

interface ICameraProps {
  isFaceControl: boolean;
  setFrontPassportPhoto: Function;
  setBackPassportPhoto: Function;
}

const Camera: FC<ICameraProps> = ({
  isFaceControl,
  setBackPassportPhoto,
  setFrontPassportPhoto,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    frontPassportPhotoBase64,
    backPassportPhotoBase64,
    facePhotoBase64,
    setFrontPassportPhotoBase64,
    setBackPassportPhotoBase64,
  } = useSocket();
  const client = useAppSelector((state) => state.user.client);
  const error = useAppSelector((state) => state.user.error);
  const operator = useAppSelector((state) => state.user.operator);
  const isLoading = useAppSelector((state) => state.user.isLoading);
  const isCameraLoading = useAppSelector((state) => state.user.isCameraLoading);
  const legalEntity = localStorage.getItem("legal_entity");
  const clientOrganization = useAppSelector(
    (state) => state.user.clientOrganization,
  );
  // const [errorLabel, setErrorLabel] = useState<string | null>(
  //   isFaceControl
  //     ? "Пройдите верификацию"
  //     : "Данные указаны неверно или отсутствуют. Пожалуйста, пройдите идентификацию"
  // );

  useEffect(() => {
    dispatch(userSlice.actions.resetError());
  }, []);

  useEffect(() => {
    setFrontPassportPhoto(frontPassportPhotoBase64);
  }, [frontPassportPhotoBase64]);

  useEffect(() => {
    setBackPassportPhoto(backPassportPhotoBase64);
  }, [backPassportPhotoBase64]);

  useEffect(() => {
    if (!error) return;
    toastError(error);
  }, [error]);

  const onCheckClick = async () => {
    if (!isFaceControl) {
      let newFrontPassportPhotoBase64 = null;
      let newBackPassportPhotoBase64 = null;
      if (
        !facePhotoBase64 ||
        !frontPassportPhotoBase64 ||
        !backPassportPhotoBase64
      ) {
        toastError(
          "Фотографируйте лицо клиента, лицо клиента с паспортом, передняя и задняя часть паспорта клиента",
        );
        return;
      }
      const getFrontPassportDataResult = await dispatch(
        getFrontPassportData(frontPassportPhotoBase64),
      );
      if (!getFrontPassportDataResult) return;
      if (getFrontPassportDataResult?.Images?.["Document front side"]) {
        newFrontPassportPhotoBase64 = `data:image/png;base64,${getFrontPassportDataResult.Images["Document front side"]}`;
        setFrontPassportPhotoBase64(newFrontPassportPhotoBase64);
      }

      const getBackPassportDataResult = await dispatch(
        getBackPassportData(
          backPassportPhotoBase64,
          getFrontPassportDataResult,
        ),
      );
      if (!getBackPassportDataResult) return;

      if (getBackPassportDataResult?.Images?.["Document front side"]) {
        newBackPassportPhotoBase64 = `data:image/png;base64,${getBackPassportDataResult.Images["Document front side"]}`;
        setBackPassportPhotoBase64(newBackPassportPhotoBase64);
      }

      if (operator?.id === 91) {
        navigate("/support");
        return;
      }

      const checkLivenessResult = await dispatch(
        checkLiveness(facePhotoBase64),
      );
      if (!checkLivenessResult) return;

      if (!newBackPassportPhotoBase64 || !newFrontPassportPhotoBase64) return;
      const compareFacesResult = await dispatch(
        compareFaces(
          facePhotoBase64,
          newFrontPassportPhotoBase64,
          isFaceControl,
        ),
      );
      if (!compareFacesResult) return;
      navigate("/support");
    } else {
      if (!facePhotoBase64) {
        toastError("Фотографируйте лицо клиента");
        return;
      }
      if (!client) return;

      if (legalEntity === "true" && !clientOrganization) {
        toastError("Выберите организацию клиента!");
        return;
      }

      const checkLivenessResult = await dispatch(
        checkLiveness(facePhotoBase64),
      );
      if (!checkLivenessResult) return;

      const compareFacesResult = await dispatch(
        compareFaces(
          facePhotoBase64,
          client.front_side_passport,
          isFaceControl,
        ),
      );
      if (!compareFacesResult) return;

      const token = await dispatch(
        setResult({
          address: client!.address,
          blood_group: client!.blood_group,
          date_of_birth: client!.date_of_birth,
          doc_number: client!.serial_passport,
          expiry_date: client!.exp_date,
          first_name: client!.name,
          first_name_en: client!.first_name_en,
          inn: client!.inn,
          issue_date: client!.issue_date,
          issuin_agency: client!.place,
          issuin_agency_en: client!.issuin_agency_en,
          last_name: client!.lastname,
          last_name_en: client!.last_name_en,
          middle_name: client!.middlename,
          middle_name_en: client!.middle_name_en,
          national_id: client!.national_id,
          nationality_code: client!.nationality_code,
          nationality_code_en: client!.nationality_code_en,
          phone: client!.phone,
          sex: client!.sex,
          legal_entity: legalEntity === "true",
          organization: clientOrganization,
        }),
      );

      if (!token) return;
      console.log("token", token);
      window.opener.postMessage(token, "*");
    }
  };

  const openCamera = () => {
    if (!operator) return;
    dispatch(startDesktop(operator.id)).then((data) => {
      if (data) {
        toastSuccess("Камера успешно запущена!");
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col">
        <div className="flex mb-4 justify-between">
          <div className="flex flex-col justify-center">
            <div className="flex flex-col mt-6 w-[400px]">
              {isLoading ? (
                <button
                  disabled
                  type="button"
                  className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 flex justify-center items-center w-full"
                >
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#1C64F2"
                    />
                  </svg>
                  Проверка данных...
                </button>
              ) : (
                <button
                  className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none w-full"
                  onClick={onCheckClick}
                >
                  Проверить
                </button>
              )}

              {isCameraLoading ? (
                <button
                  disabled
                  type="button"
                  className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 flex justify-center items-center w-full"
                >
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#1C64F2"
                    />
                  </svg>
                  Камера открывается...
                </button>
              ) : (
                <button
                  className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none w-full"
                  onClick={openCamera}
                >
                  Открыть камеру
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          {!isFaceControl && (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold text-center">
                Лицевая сторона паспорта
              </h2>
              <img
                className="w-[300px] object-cover"
                src={
                  frontPassportPhotoBase64
                    ? frontPassportPhotoBase64
                    : "./default_image.jpeg"
                }
              />
            </div>
          )}
          {!isFaceControl && (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold text-center">
                Оборотная сторона паспорта
              </h2>
              <img
                className="w-[300px] object-cover"
                src={
                  backPassportPhotoBase64
                    ? backPassportPhotoBase64
                    : "./default_image.jpeg"
                }
              />
            </div>
          )}

          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-center">
              Фотография лица клиента
            </h2>
            <img
              className="w-[300px] object-cover"
              src={facePhotoBase64 ? facePhotoBase64 : "./default_image.jpeg"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Camera;
